import type { PermissionResourceContext } from "./permission-resources"
import { scheduleMicrotask } from "./schedule-microtask"

export type PermissionDecision = "allowed" | "denied" | "unknown"
export type PermissionServiceStatus = "pending" | "supported" | "unsupported" | "unavailable"

export interface ActionPermissionCheck {
  action: string
  context?: PermissionResourceContext
}

export interface PermissionResult {
  decision: PermissionDecision
  /** Discoverability only; never an authorization for a write. */
  potential?: boolean
}

export interface PermissionRequest {
  id: string
  action: string
  bucket?: string
  object?: string
  versionId?: string
  keyId?: string
  prefix?: string
  retainUntilDate?: string
  retentionMode?: "GOVERNANCE" | "COMPLIANCE"
  legalHoldStatus?: "ON" | "OFF"
  requestTags?: Record<string, string>
  authType?: "REST-HEADER" | "REST-QUERY-STRING"
  operation?: PermissionResourceContext["operation"]
  copySource?: { bucket: string; object: string; versionId?: string } | null
  ifMatch?: string | null
  ifNoneMatch?: string | null
}

export function permissionCheckKey({ action, context = {} }: ActionPermissionCheck): string {
  return JSON.stringify([
    action,
    context.bucket ?? null,
    context.objectKey ?? null,
    context.versionId ?? null,
    context.keyId ?? null,
    context.prefix ?? null,
    context.retainUntilDate ?? null,
    context.retentionMode ?? null,
    context.legalHoldStatus ?? null,
    context.requestTags === undefined
      ? null
      : Object.entries(context.requestTags).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
    context.authType ?? (action.startsWith("s3:") ? "REST-HEADER" : null),
    context.operation ?? null,
    context.copySource === undefined
      ? []
      : context.copySource === null
        ? null
        : [context.copySource.bucket, context.copySource.objectKey, context.copySource.versionId ?? null],
    context.ifMatch === undefined ? [] : context.ifMatch,
    context.ifNoneMatch === undefined ? [] : context.ifNoneMatch,
  ])
}

export function permissionRequest(check: ActionPermissionCheck, id: string): PermissionRequest {
  const context = check.context ?? {}
  return {
    id,
    action: check.action,
    ...(context.bucket !== undefined && { bucket: context.bucket }),
    ...(context.objectKey !== undefined && { object: context.objectKey }),
    ...(context.versionId !== undefined && { versionId: context.versionId }),
    ...(context.keyId !== undefined && { keyId: context.keyId }),
    ...(["s3:ListBucket", "s3:ListBucketVersions"].includes(check.action) &&
      context.prefix !== undefined && { prefix: context.prefix }),
    ...(context.retainUntilDate !== undefined && { retainUntilDate: context.retainUntilDate }),
    ...(context.retentionMode !== undefined && { retentionMode: context.retentionMode }),
    ...(context.legalHoldStatus !== undefined && { legalHoldStatus: context.legalHoldStatus }),
    ...(context.requestTags !== undefined && { requestTags: context.requestTags }),
    ...(check.action.startsWith("s3:") && { authType: context.authType ?? "REST-HEADER" }),
    ...(context.operation !== undefined && { operation: context.operation }),
    ...(context.copySource !== undefined && {
      copySource:
        context.copySource === null
          ? null
          : {
              bucket: context.copySource.bucket,
              object: context.copySource.objectKey,
              ...(context.copySource.versionId !== undefined && { versionId: context.copySource.versionId }),
            },
    }),
    ...(context.ifMatch !== undefined && { ifMatch: context.ifMatch }),
    ...(context.ifNoneMatch !== undefined && { ifNoneMatch: context.ifNoneMatch }),
  }
}

function parseResults(response: unknown, requests: PermissionRequest[]): PermissionResult[] {
  if (!response || typeof response !== "object" || !("results" in response) || !Array.isArray(response.results)) {
    throw new Error("Invalid permission response")
  }
  const results = new Map<string, PermissionResult>()
  for (const item of response.results) {
    if (
      !item ||
      typeof item.id !== "string" ||
      results.has(item.id) ||
      !["allowed", "denied", "unknown"].includes(item.decision) ||
      (item.potential !== undefined && (typeof item.potential !== "boolean" || item.decision !== "unknown"))
    ) {
      throw new Error("Invalid permission response")
    }
    results.set(item.id, {
      decision: item.decision,
      ...(item.potential !== undefined && { potential: item.potential }),
    })
  }
  if (results.size !== requests.length || requests.some(({ id }) => !results.has(id))) {
    throw new Error("Incomplete permission response")
  }
  return requests.map(({ id }) => results.get(id)!)
}

type PermissionTransport = (requests: PermissionRequest[]) => Promise<unknown>
interface PendingCheck {
  check: ActionPermissionCheck
  resolve: (result: PermissionResult) => void
  promise: Promise<PermissionResult>
}

const UNKNOWN: PermissionResult = { decision: "unknown" }
const MAX_BATCH_SIZE = 64
const MAX_BATCH_BYTES = 60 * 1024
const MAX_CACHE_SIZE = 2048

/** A cache belongs to one authenticated API client and is discarded on identity changes. */
export class EffectivePermissionClient {
  status: PermissionServiceStatus
  private active = true
  private generation = 0
  private scheduled = false
  private cache = new Map<string, PermissionResult>()
  private pins = new Map<string, number>()
  private idleKeys = new Set<string>()
  private pending = new Map<string, PendingCheck>()
  private inFlight = new Map<string, Promise<PermissionResult>>()
  private readonly transport: PermissionTransport | null
  private readonly notify: () => void
  private supportedEndpoint = false
  private failedKeys = new Set<string>()
  private retryTimer?: ReturnType<typeof setTimeout>
  private retryAttempt = 0

  constructor(transport: PermissionTransport | null, notify: () => void) {
    this.transport = transport
    this.notify = notify
    this.status = transport ? "pending" : "unsupported"
  }

  peek(check: ActionPermissionCheck): PermissionResult | undefined {
    const key = permissionCheckKey(check)
    if (this.idleKeys.has(key)) {
      this.idleKeys.delete(key)
      this.idleKeys.add(key)
    }
    return this.active ? this.cache.get(key) : undefined
  }

  /** Visible scopes retain their decisions; the capacity limit applies only to idle entries. */
  pin(checks: ActionPermissionCheck[]): () => void {
    if (!this.active) return () => {}
    const keys = [...new Set(checks.map(permissionCheckKey))]
    for (const key of keys) {
      this.pins.set(key, (this.pins.get(key) ?? 0) + 1)
      this.idleKeys.delete(key)
    }
    let released = false
    return () => {
      if (released) return
      released = true
      for (const key of keys) {
        const count = this.pins.get(key)
        if (count === undefined) continue
        if (count > 1) this.pins.set(key, count - 1)
        else {
          this.pins.delete(key)
          if (this.cache.has(key)) this.idleKeys.add(key)
        }
      }
      // React replaces an effect's scope in the same commit. Do not evict that
      // scope's still-visible decisions between cleanup and the next registration.
      scheduleMicrotask(() => this.pruneIdle())
    }
  }

  private pruneIdle(): void {
    while (this.idleKeys.size > MAX_CACHE_SIZE) {
      const key = this.idleKeys.values().next().value!
      this.idleKeys.delete(key)
      this.cache.delete(key)
    }
  }

  hasPending(check?: ActionPermissionCheck): boolean {
    if (!this.active) return false
    if (check) {
      const key = permissionCheckKey(check)
      return this.inFlight.has(key) || (this.retryTimer !== undefined && this.failedKeys.has(key))
    }
    return this.inFlight.size > 0 || this.retryTimer !== undefined
  }

  load(check: ActionPermissionCheck, fresh = false): Promise<PermissionResult> {
    if (!this.active || !this.transport || this.status === "unsupported") return Promise.resolve(UNKNOWN)
    const key = permissionCheckKey(check)
    if (!fresh && this.cache.has(key)) return Promise.resolve(this.cache.get(key)!)
    // A submission must not reuse an earlier render-time decision that is still in flight.
    if (fresh && this.inFlight.has(key)) {
      return this.inFlight.get(key)!.then(() => this.load(check, true))
    }
    if (this.inFlight.has(key)) return this.inFlight.get(key)!
    let resolve!: (result: PermissionResult) => void
    const promise = new Promise<PermissionResult>((done) => {
      resolve = done
    })
    this.pending.set(key, { check, resolve, promise })
    this.inFlight.set(key, promise)
    if (!this.scheduled) {
      this.scheduled = true
      scheduleMicrotask(() => void this.flush())
    }
    return promise
  }

  invalidate(): void {
    this.generation += 1
    this.cache.clear()
    this.idleKeys.clear()
    this.clearRetry()
    if (this.status === "unavailable") this.status = "pending"
    if (this.active) this.notify()
  }

  dispose(): void {
    this.active = false
    this.generation += 1
    this.cache.clear()
    this.idleKeys.clear()
    this.pins.clear()
    this.clearRetry()
    for (const { resolve } of this.pending.values()) resolve(UNKNOWN)
    this.pending.clear()
    this.inFlight.clear()
  }

  activate(): void {
    this.active = true
  }

  private clearRetry(): void {
    if (this.retryTimer !== undefined) clearTimeout(this.retryTimer)
    this.retryTimer = undefined
    this.failedKeys.clear()
    this.retryAttempt = 0
  }

  private scheduleRetry(): void {
    if (this.retryTimer !== undefined || !this.failedKeys.size || !this.active) return
    const delay = Math.min(1000 * 2 ** this.retryAttempt++, 30000)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined
      if (!this.active) return
      for (const key of this.failedKeys) {
        this.cache.delete(key)
        this.idleKeys.delete(key)
      }
      this.failedKeys.clear()
      if (this.status === "unavailable") this.status = "pending"
      this.notify()
    }, delay)
    // A cache used outside React must not keep a Node test/CLI process alive.
    if (typeof this.retryTimer === "object" && "unref" in this.retryTimer) this.retryTimer.unref()
  }

  private async flush(): Promise<void> {
    this.scheduled = false
    if (!this.active || !this.transport) return
    if (this.status === "unsupported") {
      for (const [key, { resolve, promise }] of this.pending) {
        if (this.inFlight.get(key) === promise) this.inFlight.delete(key)
        resolve(UNKNOWN)
      }
      this.pending.clear()
      return
    }
    const batch: Array<[string, PendingCheck]> = []
    const encoder = new TextEncoder()
    const envelopeBytes = encoder.encode(JSON.stringify({ checks: [] })).length
    let bytes = envelopeBytes
    let rejected = false
    for (const entry of this.pending.entries()) {
      const encoded = encoder.encode(JSON.stringify(permissionRequest(entry[1].check, String(batch.length)))).length
      if (encoded + envelopeBytes > MAX_BATCH_BYTES) {
        this.pending.delete(entry[0])
        this.inFlight.delete(entry[0])
        this.cache.set(entry[0], UNKNOWN)
        if (!this.pins.has(entry[0])) this.idleKeys.add(entry[0])
        this.pruneIdle()
        entry[1].resolve(UNKNOWN)
        rejected = true
        continue
      }
      if (batch.length === MAX_BATCH_SIZE || bytes + encoded + (batch.length ? 1 : 0) > MAX_BATCH_BYTES) break
      bytes += encoded + (batch.length ? 1 : 0)
      batch.push(entry)
    }
    if (!batch.length) {
      if (rejected) this.notify()
      return
    }
    for (const [key] of batch) this.pending.delete(key)
    const requests = batch.map(([, { check }], index) => permissionRequest(check, String(index)))
    const generation = this.generation
    let results: PermissionResult[]
    let failed = false
    try {
      results = parseResults(await this.transport(requests), requests)
      if (this.active && generation === this.generation) {
        this.status = "supported"
        this.supportedEndpoint = true
      }
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? error.status : undefined
      if (this.active && generation === this.generation)
        this.status =
          !this.supportedEndpoint && [404, 405, 501].includes(Number(status)) ? "unsupported" : "unavailable"
      failed = true
      results = requests.map(() => UNKNOWN)
    }
    for (const [index, [key, { resolve, promise }]] of batch.entries()) {
      const result = this.active && generation === this.generation ? results[index] : UNKNOWN
      if (this.active && generation === this.generation) {
        this.cache.delete(key)
        this.cache.set(key, result)
        this.idleKeys.delete(key)
        if (!this.pins.has(key)) this.idleKeys.add(key)
        this.pruneIdle()
        if (failed && this.status !== "unsupported") this.failedKeys.add(key)
        else this.failedKeys.delete(key)
      }
      if (this.inFlight.get(key) === promise) this.inFlight.delete(key)
      resolve(result)
    }
    if (this.failedKeys.size) this.scheduleRetry()
    else this.clearRetry()
    if (this.active) this.notify()
    if (this.pending.size && this.active) {
      this.scheduled = true
      scheduleMicrotask(() => void this.flush())
    }
  }
}
