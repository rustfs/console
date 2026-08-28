"use client"

import { useCallback, useEffect, useRef } from "react"
import { useApi } from "@/contexts/api-context"
import {
  buildTableCatalogPath,
  encodeCatalogSegment,
  normalizeTableCatalogPrefix,
  namespaceCatalogPath,
  TABLE_CATALOG_NAMESPACE_SEPARATOR,
  TABLE_CATALOG_PREFIX,
  tableBucketCatalogPath,
  tableCatalogPath,
  tablesCatalogPath,
  viewCatalogPath,
  viewsCatalogPath,
} from "@/lib/table-catalog-paths"

export type StringMap = Record<string, string>

export interface CatalogConfig {
  defaults: StringMap
  overrides: StringMap
  endpoints: string[]
  adminDiscovery: StringMap
}

export interface TableBucketInfo {
  tableBucket: string
  enabled: boolean
  catalogType: string
  warehouse: string
  warehouseLocation: string
  catalogUri: string
  compatCatalogUri: string
  credentialVending: string
  credentialScope: string
  credentialScopePrefix: string
  catalogEntryPresent: boolean
  properties: StringMap
}

export interface NamespaceSummary {
  namespace: string[]
  properties: StringMap
  propertiesLoaded?: boolean
}

export interface NamespacePropertiesUpdatePayload {
  removals?: string[]
  updates?: StringMap
}

export interface TableIdentifier {
  namespace: string[]
  name: string
}

export interface ViewIdentifier {
  namespace: string[]
  name: string
}

export interface StorageCredential {
  prefix: string
  config: StringMap
}

export interface LoadedTable {
  metadataLocation: string
  metadata: Record<string, unknown>
  config: StringMap
  storageCredentials: StorageCredential[]
}

export interface LoadedView {
  metadataLocation: string
  metadata: Record<string, unknown>
  config: StringMap
}

export interface TableRefs {
  tableBucket: string
  namespace: string
  table: string
  currentMetadataLocation: string
  currentSnapshotId?: number
  protectedRefCount: number
  userDefinedRefCount: number
  refs: Record<string, unknown>
}

export interface CreateTablePayload {
  name: string
  schema: Record<string, unknown>
  location?: string
  partitionSpec?: Record<string, unknown>
  writeOrder?: Record<string, unknown>
  stageCreate?: boolean
  properties?: StringMap
}

export interface CommitTablePayload {
  identifier?: TableIdentifier
  commitId?: string
  idempotencyKey?: string
  operation?: string
  expectedVersionToken?: string
  expectedMetadataLocation?: string
  requirements?: Record<string, unknown>[]
  updates: Record<string, unknown>[]
  writer?: string
}

export interface CommitTableResponse {
  metadataLocation: string
  metadata: Record<string, unknown>
  versionToken: string
  generation?: number
  commitId: string
}

export interface CreateViewPayload {
  name: string
  schema: Record<string, unknown>
  viewVersion: Record<string, unknown>
  location?: string
  properties?: StringMap
}

export interface ReplaceViewPayload {
  identifier?: ViewIdentifier
  expectedVersionToken?: string
  expectedMetadataLocation?: string
  requirements?: Record<string, unknown>[]
  updates: Record<string, unknown>[]
}

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {}
}

function stringValue(value: unknown, ...keys: string[]): string {
  const object = asObject(value)
  for (const key of keys) {
    const candidate = object[key]
    if (typeof candidate === "string") return candidate
  }
  return ""
}

function booleanValue(value: unknown, ...keys: string[]): boolean {
  const object = asObject(value)
  for (const key of keys) {
    const candidate = object[key]
    if (typeof candidate === "boolean") return candidate
  }
  return false
}

function numberValue(value: unknown, ...keys: string[]): number | undefined {
  const object = asObject(value)
  for (const key of keys) {
    const candidate = object[key]
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate
  }
  return undefined
}

function stringMap(value: unknown): StringMap {
  const object = asObject(value)
  return Object.fromEntries(
    Object.entries(object).flatMap(([key, candidate]) => {
      if (typeof candidate === "string") return [[key, candidate]]
      if (typeof candidate === "number" || typeof candidate === "boolean") return [[key, String(candidate)]]
      return []
    }),
  )
}

function namespaceSegments(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((segment): segment is string => typeof segment === "string" && segment.length > 0)
}

export function normalizeCatalogConfig(value: unknown): CatalogConfig {
  const object = asObject(value)
  return {
    defaults: stringMap(object.defaults),
    overrides: stringMap(object.overrides),
    endpoints: Array.isArray(object.endpoints)
      ? object.endpoints.filter((endpoint): endpoint is string => typeof endpoint === "string")
      : [],
    adminDiscovery: stringMap(object.admin_discovery ?? object.adminDiscovery),
  }
}

export function normalizeTableBucket(value: unknown, fallbackBucket = ""): TableBucketInfo {
  return {
    tableBucket: stringValue(value, "table-bucket", "tableBucket") || fallbackBucket,
    enabled: booleanValue(value, "enabled"),
    catalogType: stringValue(value, "catalog-type", "catalogType"),
    warehouse: stringValue(value, "warehouse") || fallbackBucket,
    warehouseLocation: stringValue(value, "warehouse-location", "warehouseLocation"),
    catalogUri: stringValue(value, "catalog-uri", "catalogUri"),
    compatCatalogUri: stringValue(value, "compat-catalog-uri", "compatCatalogUri"),
    credentialVending: stringValue(value, "credential-vending", "credentialVending"),
    credentialScope: stringValue(value, "credential-scope", "credentialScope"),
    credentialScopePrefix: stringValue(value, "credential-scope-prefix", "credentialScopePrefix"),
    catalogEntryPresent: booleanValue(value, "catalog-entry-present", "catalogEntryPresent"),
    properties: stringMap(asObject(value).properties),
  }
}

export function normalizeNamespacePage(value: unknown): { items: NamespaceSummary[]; nextPageToken?: string } {
  const object = asObject(value)
  const items = Array.isArray(object.namespaces)
    ? object.namespaces
        .map((namespace) => namespaceSegments(namespace))
        .filter((namespace) => namespace.length > 0)
        .map((namespace) => ({ namespace, properties: {}, propertiesLoaded: false }))
    : []
  const nextPageToken = stringValue(value, "next-page-token", "nextPageToken") || undefined
  return { items, nextPageToken }
}

export function normalizeNamespace(value: unknown, fallbackNamespace: string[] = []): NamespaceSummary {
  const object = asObject(value)
  const namespace = namespaceSegments(object.namespace)
  return {
    namespace: namespace.length ? namespace : fallbackNamespace,
    properties: stringMap(object.properties),
    propertiesLoaded: true,
  }
}

export function normalizeTablePage(value: unknown): { items: TableIdentifier[]; nextPageToken?: string } {
  const object = asObject(value)
  const items = Array.isArray(object.identifiers)
    ? object.identifiers
        .map((identifier) => {
          const item = asObject(identifier)
          const namespace = namespaceSegments(item.namespace)
          const name = typeof item.name === "string" ? item.name : ""
          return namespace.length > 0 && name ? { namespace, name } : null
        })
        .filter((identifier): identifier is TableIdentifier => identifier !== null)
    : []
  const nextPageToken = stringValue(value, "next-page-token", "nextPageToken") || undefined
  return { items, nextPageToken }
}

export function normalizeLoadedTable(value: unknown): LoadedTable {
  const object = asObject(value)
  const credentials = Array.isArray(object["storage-credentials"] ?? object.storageCredentials)
    ? ((object["storage-credentials"] ?? object.storageCredentials) as unknown[])
    : []

  return {
    metadataLocation: stringValue(value, "metadata-location", "metadataLocation"),
    metadata: asObject(object.metadata),
    config: stringMap(object.config),
    storageCredentials: credentials.map((credential) => {
      const item = asObject(credential)
      return {
        prefix: stringValue(credential, "prefix"),
        config: stringMap(item.config),
      }
    }),
  }
}

export function normalizeViewPage(value: unknown): { items: ViewIdentifier[]; nextPageToken?: string } {
  const object = asObject(value)
  const items = Array.isArray(object.identifiers)
    ? object.identifiers
        .map((identifier) => {
          const item = asObject(identifier)
          const namespace = namespaceSegments(item.namespace)
          const name = typeof item.name === "string" ? item.name : ""
          return namespace.length > 0 && name ? { namespace, name } : null
        })
        .filter((identifier): identifier is ViewIdentifier => identifier !== null)
    : []
  const nextPageToken = stringValue(value, "next-page-token", "nextPageToken") || undefined
  return { items, nextPageToken }
}

export function normalizeLoadedView(value: unknown): LoadedView {
  const object = asObject(value)
  return {
    metadataLocation: stringValue(value, "metadata-location", "metadataLocation"),
    metadata: asObject(object.metadata),
    config: stringMap(object.config),
  }
}

export function normalizeCommitTableResponse(value: unknown): CommitTableResponse {
  return {
    metadataLocation: stringValue(value, "metadata-location", "metadataLocation"),
    metadata: asObject(asObject(value).metadata),
    versionToken: stringValue(value, "version-token", "versionToken"),
    generation: numberValue(value, "generation"),
    commitId: stringValue(value, "commit-id", "commitId"),
  }
}

export function normalizeTableRefs(value: unknown): TableRefs {
  return {
    tableBucket: stringValue(value, "table-bucket", "tableBucket"),
    namespace: stringValue(value, "namespace"),
    table: stringValue(value, "table"),
    currentMetadataLocation: stringValue(value, "current-metadata-location", "currentMetadataLocation"),
    currentSnapshotId: numberValue(value, "current-snapshot-id", "currentSnapshotId"),
    protectedRefCount: numberValue(value, "protected-ref-count", "protectedRefCount") ?? 0,
    userDefinedRefCount: numberValue(value, "user-defined-ref-count", "userDefinedRefCount") ?? 0,
    refs: asObject(asObject(value).refs),
  }
}

function appendQuery(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params)
  return `${path}?${query.toString()}`
}

export function useTableCatalog(catalogPrefix: string = TABLE_CATALOG_PREFIX) {
  const api = useApi()
  const normalizedCatalogPrefix = normalizeTableCatalogPrefix(catalogPrefix)
  const catalogPrefixRef = useRef(normalizedCatalogPrefix)
  // Keep request callbacks stable while allowing the page to swap to the
  // prefix discovered from the catalog config response.
  useEffect(() => {
    catalogPrefixRef.current = normalizedCatalogPrefix
  }, [normalizedCatalogPrefix])

  const requestUrl = useCallback((path: string) => api.resolveUrl(path), [api])

  const getCatalogConfig = useCallback(async () => {
    // The canonical config route is the discovery bootstrap. Operational
    // requests switch to the prefix advertised by this response.
    const response = await api.get(requestUrl(buildTableCatalogPath("config")), { suppress403Redirect: true })
    return normalizeCatalogConfig(response)
  }, [api, requestUrl])

  const getTableBucket = useCallback(
    async (bucket: string, requestPrefix = catalogPrefixRef.current) => {
      const response = await api.get(requestUrl(tableBucketCatalogPath(bucket, requestPrefix)), {
        suppress403Redirect: true,
      })
      return normalizeTableBucket(response, bucket)
    },
    [api, requestUrl],
  )

  const enableTableBucket = useCallback(
    async (bucket: string) => {
      const response = await api.put(requestUrl(tableBucketCatalogPath(bucket, catalogPrefixRef.current)), null, {
        suppress403Redirect: true,
      })
      return normalizeTableBucket(response, bucket)
    },
    [api, requestUrl],
  )

  const listNamespaces = useCallback(
    async (bucket: string) => {
      const items: NamespaceSummary[] = []
      const visited = new Set<string>()

      const listChildren = async (parent?: string[]) => {
        const children: NamespaceSummary[] = []
        let nextPageToken: string | undefined
        do {
          const path = buildTableCatalogPath(`${encodeCatalogSegment(bucket)}/namespaces`, catalogPrefixRef.current)
          const params: Record<string, string> = { pageSize: "1000" }
          if (parent?.length) params.parent = parent.join(TABLE_CATALOG_NAMESPACE_SEPARATOR)
          if (nextPageToken) params.pageToken = nextPageToken
          const response = await api.get(requestUrl(appendQuery(path, params)), { suppress403Redirect: true })
          const page = normalizeNamespacePage(response)
          children.push(...page.items)
          nextPageToken = page.nextPageToken
        } while (nextPageToken)
        return children
      }

      const visit = async (parent?: string[]) => {
        for (const child of await listChildren(parent)) {
          const key = child.namespace.join(TABLE_CATALOG_NAMESPACE_SEPARATOR)
          if (visited.has(key)) continue
          visited.add(key)
          items.push(child)
          await visit(child.namespace)
        }
      }

      await visit()
      return items
    },
    [api, requestUrl],
  )

  const createNamespace = useCallback(
    async (bucket: string, namespace: string[], properties: StringMap = {}) => {
      const body: JsonObject = { namespace }
      if (Object.keys(properties).length > 0) body.properties = properties
      const response = await api.post(
        requestUrl(buildTableCatalogPath(`${encodeCatalogSegment(bucket)}/namespaces`, catalogPrefixRef.current)),
        body,
        {
          suppress403Redirect: true,
        },
      )
      const object = asObject(response)
      return {
        namespace: namespaceSegments(object.namespace).length ? namespaceSegments(object.namespace) : namespace,
        properties: stringMap(object.properties),
        propertiesLoaded: true,
      } satisfies NamespaceSummary
    },
    [api, requestUrl],
  )

  const getNamespace = useCallback(
    async (bucket: string, namespace: string[]) => {
      const response = await api.get(requestUrl(namespaceCatalogPath(bucket, namespace, catalogPrefixRef.current)), {
        suppress403Redirect: true,
      })
      return normalizeNamespace(response, namespace)
    },
    [api, requestUrl],
  )

  const updateNamespaceProperties = useCallback(
    async (bucket: string, namespace: string[], payload: NamespacePropertiesUpdatePayload) => {
      const body: JsonObject = {
        removals: payload.removals ?? [],
        updates: payload.updates ?? {},
      }
      const response = await api.post(
        requestUrl(`${namespaceCatalogPath(bucket, namespace, catalogPrefixRef.current)}/properties`),
        body,
        {
          suppress403Redirect: true,
        },
      )
      return asObject(response)
    },
    [api, requestUrl],
  )

  const dropNamespace = useCallback(
    async (bucket: string, namespace: string[]) => {
      await api.delete(requestUrl(namespaceCatalogPath(bucket, namespace, catalogPrefixRef.current)), {
        suppress403Redirect: true,
      })
    },
    [api, requestUrl],
  )

  const listTables = useCallback(
    async (bucket: string, namespace: string[]) => {
      const items: TableIdentifier[] = []
      let nextPageToken: string | undefined
      do {
        const path = tablesCatalogPath(bucket, namespace, catalogPrefixRef.current)
        const response = await api.get(
          requestUrl(
            nextPageToken
              ? appendQuery(path, { pageSize: "1000", pageToken: nextPageToken })
              : appendQuery(path, { pageSize: "1000" }),
          ),
          { suppress403Redirect: true },
        )
        const page = normalizeTablePage(response)
        items.push(...page.items)
        nextPageToken = page.nextPageToken
      } while (nextPageToken)
      return items
    },
    [api, requestUrl],
  )

  const createTable = useCallback(
    async (bucket: string, namespace: string[], payload: CreateTablePayload) => {
      const body: JsonObject = {
        name: payload.name,
        schema: payload.schema,
      }
      if (payload.location) body.location = payload.location
      if (payload.partitionSpec) body["partition-spec"] = payload.partitionSpec
      if (payload.writeOrder) body["write-order"] = payload.writeOrder
      if (payload.stageCreate) body["stage-create"] = true
      if (payload.properties && Object.keys(payload.properties).length > 0) body.properties = payload.properties

      const response = await api.post(
        requestUrl(tablesCatalogPath(bucket, namespace, catalogPrefixRef.current)),
        body,
        {
          suppress403Redirect: true,
        },
      )
      return normalizeLoadedTable(response)
    },
    [api, requestUrl],
  )

  const loadTable = useCallback(
    async (bucket: string, namespace: string[], table: string) => {
      const response = await api.get(requestUrl(tableCatalogPath(bucket, namespace, table, catalogPrefixRef.current)), {
        suppress403Redirect: true,
      })
      return normalizeLoadedTable(response)
    },
    [api, requestUrl],
  )

  const dropTable = useCallback(
    async (bucket: string, namespace: string[], table: string) => {
      await api.delete(requestUrl(tableCatalogPath(bucket, namespace, table, catalogPrefixRef.current)), {
        suppress403Redirect: true,
      })
    },
    [api, requestUrl],
  )

  const commitTable = useCallback(
    async (bucket: string, namespace: string[], table: string, payload: CommitTablePayload) => {
      const body: JsonObject = {
        requirements: payload.requirements ?? [],
        updates: payload.updates,
      }
      if (payload.identifier) body.identifier = payload.identifier
      if (payload.commitId) body["commit-id"] = payload.commitId
      if (payload.idempotencyKey) body["idempotency-key"] = payload.idempotencyKey
      if (payload.operation) body.operation = payload.operation
      if (payload.expectedVersionToken) body["expected-version-token"] = payload.expectedVersionToken
      if (payload.expectedMetadataLocation) body["expected-metadata-location"] = payload.expectedMetadataLocation
      if (payload.writer) body.writer = payload.writer

      const response = await api.post(
        requestUrl(tableCatalogPath(bucket, namespace, table, catalogPrefixRef.current)),
        body,
        {
          suppress403Redirect: true,
        },
      )
      return normalizeCommitTableResponse(response)
    },
    [api, requestUrl],
  )

  const listViews = useCallback(
    async (bucket: string, namespace: string[]) => {
      const items: ViewIdentifier[] = []
      let nextPageToken: string | undefined
      do {
        const path = viewsCatalogPath(bucket, namespace, catalogPrefixRef.current)
        const response = await api.get(
          requestUrl(
            nextPageToken
              ? appendQuery(path, { pageSize: "1000", pageToken: nextPageToken })
              : appendQuery(path, { pageSize: "1000" }),
          ),
          { suppress403Redirect: true },
        )
        const page = normalizeViewPage(response)
        items.push(...page.items)
        nextPageToken = page.nextPageToken
      } while (nextPageToken)
      return items
    },
    [api, requestUrl],
  )

  const createView = useCallback(
    async (bucket: string, namespace: string[], payload: CreateViewPayload) => {
      const body: JsonObject = {
        name: payload.name,
        schema: payload.schema,
        "view-version": payload.viewVersion,
      }
      if (payload.location) body.location = payload.location
      if (payload.properties && Object.keys(payload.properties).length > 0) body.properties = payload.properties
      const response = await api.post(requestUrl(viewsCatalogPath(bucket, namespace, catalogPrefixRef.current)), body, {
        suppress403Redirect: true,
      })
      return normalizeLoadedView(response)
    },
    [api, requestUrl],
  )

  const loadView = useCallback(
    async (bucket: string, namespace: string[], view: string) => {
      const response = await api.get(requestUrl(viewCatalogPath(bucket, namespace, view, catalogPrefixRef.current)), {
        suppress403Redirect: true,
      })
      return normalizeLoadedView(response)
    },
    [api, requestUrl],
  )

  const replaceView = useCallback(
    async (bucket: string, namespace: string[], view: string, payload: ReplaceViewPayload) => {
      const body: JsonObject = {
        requirements: payload.requirements ?? [],
        updates: payload.updates,
      }
      if (payload.identifier) body.identifier = payload.identifier
      if (payload.expectedVersionToken) body["expected-version-token"] = payload.expectedVersionToken
      if (payload.expectedMetadataLocation) body["expected-metadata-location"] = payload.expectedMetadataLocation
      const response = await api.post(
        requestUrl(viewCatalogPath(bucket, namespace, view, catalogPrefixRef.current)),
        body,
        {
          suppress403Redirect: true,
        },
      )
      return normalizeLoadedView(response)
    },
    [api, requestUrl],
  )

  const dropView = useCallback(
    async (bucket: string, namespace: string[], view: string) => {
      await api.delete(requestUrl(viewCatalogPath(bucket, namespace, view, catalogPrefixRef.current)), {
        suppress403Redirect: true,
      })
    },
    [api, requestUrl],
  )

  const getTableRefs = useCallback(
    async (bucket: string, namespace: string[], table: string) => {
      const response = await api.get(
        requestUrl(`${tableCatalogPath(bucket, namespace, table, catalogPrefixRef.current)}/refs`),
        {
          suppress403Redirect: true,
        },
      )
      return normalizeTableRefs(response)
    },
    [api, requestUrl],
  )

  return {
    getCatalogConfig,
    getTableBucket,
    enableTableBucket,
    listNamespaces,
    createNamespace,
    getNamespace,
    updateNamespaceProperties,
    dropNamespace,
    listTables,
    createTable,
    loadTable,
    commitTable,
    dropTable,
    getTableRefs,
    listViews,
    createView,
    loadView,
    replaceView,
    dropView,
  }
}
