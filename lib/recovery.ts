import type { ApiClient } from "./api-client"
import type {
  IntegrityJob,
  IntegrityReadiness,
  MrfAction,
  MrfGroup,
  MrfObservation,
  MrfResponsibility,
  RecoveryReceipt,
} from "@/types/recovery"

export type RecoveryErrorCode =
  | "denied"
  | "unsupported"
  | "not-found"
  | "conflict"
  | "invalid-response"
  | "timeout"
  | "cancelled"
  | "network"
  | "busy"
  | "invalid-input"
  | "receipt-mismatch"
  | "pagination"

const messages: Record<RecoveryErrorCode, string> = {
  denied: "Permission denied for this recovery operation.",
  unsupported: "This server does not support the recovery operation.",
  "not-found": "The integrity bucket or job was not found.",
  conflict: "The selected identity changed. Read the same responsibility or job again.",
  "invalid-response": "The recovery response does not match the requested contract or identity.",
  timeout: "The recovery request exceeded its total time budget.",
  cancelled: "The recovery observation was cancelled.",
  network: "The recovery endpoint is unavailable.",
  busy: "A recovery request of this kind is already in progress.",
  "invalid-input": "Review the recovery selector and required acknowledgements.",
  "receipt-mismatch": "The receipt does not match this endpoint or the persisted job request and identity.",
  pagination: "The continuation cursor did not advance. Refresh the first page.",
}

export class RecoveryError extends Error {
  readonly code: RecoveryErrorCode
  readonly outcomeUnknown: boolean

  constructor(code: RecoveryErrorCode, outcomeUnknown = false) {
    super(messages[code])
    this.name = "RecoveryError"
    this.code = code
    this.outcomeUnknown = outcomeUnknown
  }
}

export function asRecoveryError(error: unknown): RecoveryError {
  return error instanceof RecoveryError ? error : new RecoveryError("network")
}

type RecordValue = Record<string, unknown>
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) &&
  value !== "00000000-0000-0000-0000-000000000000"
const nodeId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{64}$/.test(value)
const text = (value: unknown): value is string => typeof value === "string"
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0
const nullable = (value: unknown, check: (value: unknown) => boolean) => value === null || check(value)

function requireValue(condition: unknown, code: RecoveryErrorCode = "invalid-response"): asserts condition {
  if (!condition) throw new RecoveryError(code)
}

function record(value: unknown): RecordValue {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value))
  return value as RecordValue
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(text)
}

function responsibility(value: unknown): MrfResponsibility {
  const row = record(value)
  requireValue(
    uuid(row.responsibilityId) &&
      text(row.bucket) &&
      text(row.object) &&
      nullable(row.sourceBucketIncarnationId, uuid) &&
      nullable(row.bucketIncarnationId, uuid) &&
      nullable(row.versionId, text) &&
      text(row.status) &&
      count(row.enqueuedAtMs) &&
      nullable(row.poolIndex, count) &&
      nullable(row.setIndex, count) &&
      nullable(row.heldSinceMs, count),
  )
  if (row.accepted !== null) {
    const accepted = record(row.accepted)
    requireValue(
      count(accepted.acceptedAtMs) &&
        uuid(accepted.requestId) &&
        [accepted.actor, accepted.reason, accepted.reference].every(text) &&
        typeof accepted.acknowledgedUnknownSourceIncarnation === "boolean" &&
        typeof accepted.acknowledgedIncarnationMismatch === "boolean",
    )
  }
  requireValue(
    (row.lastIdentityProbeResult === undefined || text(row.lastIdentityProbeResult)) &&
      (row.lastIdentityProbeAtMs === undefined || count(row.lastIdentityProbeAtMs)) &&
      (row.nextIdentityProbeAtMs === undefined || count(row.nextIdentityProbeAtMs)),
  )
  return row as unknown as MrfResponsibility
}

function validateSummary(value: unknown, readable: boolean): void {
  const summary = record(value)
  requireValue(summary.contractVersion === 1 && summary.checkpointReadable === readable)
  requireValue(nullable(summary.checkpointOwner, uuid) && nullable(summary.checkpointSequence, count))
  requireValue(
    [
      "sampledAtMs",
      "activeResponsibilityCount",
      "heldCount",
      "legacyGenerationUnknownCount",
      "bucketIncarnationChangedCount",
      "operatorAcceptedCount",
      "bestEffortQueueDepth",
      "responsibilityBytes",
    ].every((field) => count(summary[field])),
  )
}

function observation(
  value: unknown,
  kind: "summary" | "list" | "get" | "action",
  target?: { node: string; id: string; state?: string },
): MrfObservation {
  const body = record(value)
  requireValue(body.contractVersion === 1, "unsupported")
  requireValue(
    text(body.topologyFingerprint) &&
      body.topologyFingerprint.length > 0 &&
      count(body.observationStartedAtMs) &&
      count(body.observationFinishedAtMs) &&
      body.observationFinishedAtMs >= body.observationStartedAtMs &&
      count(body.expectedNodes) &&
      body.expectedNodes > 0 &&
      typeof body.pageComplete === "boolean" &&
      nullable(body.nextCursor, text) &&
      body.nextCursor !== "" &&
      Array.isArray(body.nodes) &&
      body.nodes.length > 0 &&
      body.nodes.length <= body.expectedNodes,
  )
  const nodes = body.nodes as unknown[]
  const seen = new Set<string>()
  requireValue(!target || nodes.length === 1)
  for (const entry of nodes) {
    const node = record(entry)
    requireValue(nodeId(node.nodeId) && !seen.has(node.nodeId) && text(node.host) && text(node.state))
    seen.add(node.nodeId)
    requireValue(!target || node.nodeId === target.node)
    if (node.state !== "ok") {
      requireValue(!body.pageComplete)
      if (node.reply === undefined || node.reply === null) {
        delete node.reply
        continue
      }
      const failedReply = record(node.reply)
      if (failedReply.result === "error") {
        requireValue(text(failedReply.code))
      } else {
        requireValue(kind === "summary" && node.state === "error" && failedReply.result === "summary")
        validateSummary(failedReply.summary, false)
      }
      continue
    }
    const reply = record(node.reply)
    requireValue(reply.result === kind)
    if (kind === "summary") {
      validateSummary(reply.summary, true)
    } else if (kind === "list") {
      const page = record(reply.snapshot)
      requireValue(page.contractVersion === 2 && page.nodeLocal === true && count(reply.observedAtMs))
      requireValue(Array.isArray(page.responsibilities) && page.responsibilities.length <= 256)
      const ids = new Set<string>()
      for (const value of page.responsibilities) {
        const row = responsibility(value)
        requireValue(!ids.has(row.responsibilityId.toLowerCase()))
        ids.add(row.responsibilityId.toLowerCase())
      }
    } else if (kind === "get") {
      const current = record(reply.observation)
      requireValue(current.contractVersion === 1 && count(current.observedAtMs))
      if (current.responsibility !== null) {
        requireValue(responsibility(current.responsibility).responsibilityId.toLowerCase() === target?.id.toLowerCase())
      }
    } else {
      const action = record(reply.action)
      requireValue(
        text(action.responsibilityId) &&
          action.responsibilityId.toLowerCase() === target?.id.toLowerCase() &&
          action.state === target.state &&
          action.dataVerified === false &&
          action.durableResponsibilityRetained === true,
      )
    }
  }
  return body as unknown as MrfObservation
}

export function groupMrfResponsibilities(value: MrfObservation): MrfGroup[] {
  const groups = new Map<string, MrfGroup>()
  for (const node of value.nodes) {
    if (node.state !== "ok" || node.reply?.result !== "list") continue
    for (const row of node.reply.snapshot.responsibilities) {
      const source = row.sourceBucketIncarnationId
      const id = JSON.stringify(
        source
          ? [source.toLowerCase(), row.bucket, row.object, row.versionId]
          : ["unknown-source", node.nodeId, row.responsibilityId],
      )
      const group = groups.get(id) ?? {
        id,
        bucket: row.bucket,
        object: row.object,
        versionId: row.versionId,
        sourceBucketIncarnationId: source,
        responsibilities: [],
      }
      group.responsibilities.push({
        nodeId: node.nodeId,
        host: node.host,
        responsibility: row,
        observedAtMs: node.reply.observedAtMs,
      })
      groups.set(id, group)
    }
  }
  return [...groups.values()]
}

function integrityJob(value: unknown, bucket: string, id: string): IntegrityJob {
  const job = record(value)
  requireValue(job.format_version === 1, "unsupported")
  requireValue(
    job.bucket === bucket && uuid(job.id) && job.id.toLowerCase() === id.toLowerCase() && uuid(job.bucket_incarnation),
  )
  const request = record(job.request)
  requireValue(
    ["audit", "migrate"].includes(String(request.mode)) &&
      count(request.bytes_per_second) &&
      count(request.max_object_bytes) &&
      Array.isArray(request.items) &&
      request.items.length > 0 &&
      request.items.length <= 64 &&
      Array.isArray(job.results) &&
      job.results.length === request.items.length &&
      count(job.revision) &&
      text(job.state) &&
      nullable(job.last_error, text),
  )
  for (const value of request.items) {
    const item = record(value)
    requireValue(
      text(item.key) &&
        nullable(item.version_id, text) &&
        nullable(item.expected_sha256, text) &&
        nullable(item.target_key, text),
    )
  }
  for (const value of job.results as unknown[]) {
    const result = record(value)
    requireValue(
      text(result.state) &&
        nullable(result.source_size, count) &&
        ["source_fingerprint", "expected_sha256", "evidence_source", "target_version_id", "detail"].every((key) =>
          nullable(result[key], text),
        ),
    )
  }
  return job as unknown as IntegrityJob
}

function canonicalEndpoint(value: string): string {
  const url = new URL(value)
  requireValue(
    ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash,
    "receipt-mismatch",
  )
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`
}

export function parseRecoveryReceipt(value: unknown, endpoint: string): RecoveryReceipt {
  try {
    const receipt = record(value)
    requireValue(receipt.format_version === 1, "unsupported")
    requireValue(text(receipt.endpoint) && canonicalEndpoint(receipt.endpoint) === canonicalEndpoint(endpoint))
    const job = record(receipt.job)
    requireValue(text(job.bucket) && uuid(job.id))
    integrityJob(job, job.bucket, job.id)
    requireValue(
      text(receipt.alias) &&
        text(receipt.inventory_observed_at) &&
        uuid(receipt.inventory_bucket_incarnation) &&
        nullable(receipt.digest_source_reference, text) &&
        strings(receipt.query_command) &&
        strings(receipt.resume_command),
    )
    if (receipt.qualification !== null) {
      const qualification = record(receipt.qualification)
      requireValue(
        text(qualification.deployment_id) &&
          text(qualification.reference) &&
          typeof qualification.operator_attested === "boolean",
      )
    }
    const estimate = record(receipt.estimate)
    requireValue(
      ["object_count", "per_stream_bytes_per_second", "stream_passes", "peak_payload_staging_budget"].every((key) =>
        count(estimate[key]),
      ) &&
        nullable(estimate.inventory_selected_bytes, count) &&
        nullable(estimate.minimum_stream_seconds, (v) => typeof v === "number" && Number.isFinite(v) && v >= 0) &&
        text(estimate.note),
    )
    return receipt as unknown as RecoveryReceipt
  } catch (error) {
    if (error instanceof RecoveryError && error.code === "unsupported") throw error
    throw new RecoveryError("receipt-mismatch")
  }
}

function sameRequest(left: IntegrityJob["request"], right: IntegrityJob["request"]): boolean {
  return (
    left.mode === right.mode &&
    left.bytes_per_second === right.bytes_per_second &&
    left.max_object_bytes === right.max_object_bytes &&
    left.items.length === right.items.length &&
    left.items.every((item, index) => {
      const other = right.items[index]
      return (
        item.key === other.key &&
        item.version_id === other.version_id &&
        item.expected_sha256 === other.expected_sha256 &&
        item.target_key === other.target_key
      )
    })
  )
}

const MAX_BYTES = 8 * 1024 * 1024
const MRF_ROOT = "/heal/mrf/cluster"
let nextScope = 0

export class RecoveryClient {
  readonly scopeId = `recovery-${++nextScope}`
  readonly endpoint: string
  private readonly api: ApiClient
  private readonly adminBase: URL
  private readonly timeoutMs: number
  private readonly pending = new Set<string>()

  constructor(api: ApiClient, options: { timeoutMs?: number } = {}) {
    this.api = api
    this.adminBase = new URL(api.resolveUrl(""))
    requireValue(/\/rustfs\/admin\/v3\/?$/.test(this.adminBase.pathname), "invalid-input")
    const endpoint = new URL(this.adminBase)
    endpoint.pathname = endpoint.pathname.replace(/\/rustfs\/admin\/v3\/?$/, "") || "/"
    this.endpoint = canonicalEndpoint(endpoint.toString())
    this.timeoutMs = options.timeoutMs ?? 35_000
  }

  private async request(
    kind: string,
    version: 3 | 4,
    path: string,
    query: Record<string, string>,
    signal?: AbortSignal,
    body?: unknown,
  ): Promise<unknown> {
    requireValue(!this.pending.has(kind), "busy")
    requireValue(!signal?.aborted, "cancelled")
    this.pending.add(kind)
    const controller = new AbortController()
    const writing = body !== undefined
    let timeout = false
    const cancel = () => controller.abort()
    signal?.addEventListener("abort", cancel, { once: true })
    let rejectAbort: (() => void) | undefined
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(new RecoveryError(timeout ? "timeout" : "cancelled", writing))
      controller.signal.addEventListener("abort", rejectAbort, { once: true })
    })
    const timer = setTimeout(() => {
      timeout = true
      controller.abort()
    }, this.timeoutMs)
    try {
      const url = new URL(this.adminBase)
      url.pathname = url.pathname.replace(/\/v3\/?$/, `/v${version}`) + path
      url.search = new URLSearchParams(query).toString()
      const operation = async () => {
        const response = (await this.api.request(
          url.toString(),
          {
            method: writing ? "POST" : "GET",
            body,
            signal: controller.signal,
            rawResponse: true,
            redirect: "error",
            dedupe: false,
            suppress403Redirect: true,
          },
          false,
        )) as Response
        requireValue(response instanceof Response)
        if (controller.signal.aborted) {
          void response.body?.cancel().catch(() => {})
          throw new RecoveryError(timeout ? "timeout" : "cancelled", writing)
        }
        if (!response.ok && response.status !== 404) {
          void response.body?.cancel().catch(() => {})
          const status = response.status
          const code: RecoveryErrorCode =
            status === 401 || status === 403
              ? "denied"
              : status === 404 || status === 405 || status === 501
                ? "unsupported"
                : status === 409 || status === 412
                  ? "conflict"
                  : status === 400 || status === 422
                    ? "invalid-input"
                    : status === 429
                      ? "busy"
                      : "network"
          throw new RecoveryError(code, writing && ![400, 401, 403, 404, 405, 409, 412, 422, 429, 501].includes(status))
        }
        const length = response.headers.get("content-length")
        if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) {
          void response.body?.cancel().catch(() => {})
          throw new RecoveryError("invalid-response", writing)
        }
        if (!response.body && response.status === 404) throw new RecoveryError("unsupported")
        requireValue(response.body)
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let size = 0
        const stop = () => {
          void reader.cancel().catch(() => {})
        }
        controller.signal.addEventListener("abort", stop, { once: true })
        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > MAX_BYTES) throw new RecoveryError("invalid-response", writing)
            chunks.push(value)
          }
          const bytes = new Uint8Array(size)
          let offset = 0
          for (const chunk of chunks) {
            bytes.set(chunk, offset)
            offset += chunk.byteLength
          }
          let decoded: string
          try {
            decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
          } catch {
            throw new RecoveryError("invalid-response", writing)
          }
          if (response.status === 404) {
            let code: unknown
            try {
              const error = record(JSON.parse(decoded))
              code = error.code ?? error.Code
            } catch {
              code = /<Code>([^<]*)<\/Code>/.exec(decoded)?.[1]
            }
            throw new RecoveryError(
              ["NoSuchBucket", "NoSuchKey", "NoSuchObject"].includes(String(code)) ? "not-found" : "unsupported",
            )
          }
          try {
            return JSON.parse(decoded) as unknown
          } catch {
            throw new RecoveryError("invalid-response", writing)
          }
        } finally {
          controller.signal.removeEventListener("abort", stop)
          void reader.cancel().catch(() => {})
          reader.releaseLock()
        }
      }
      return await Promise.race([operation(), aborted])
    } catch (error) {
      if (error instanceof RecoveryError) {
        if (writing && error.code === "invalid-response" && !error.outcomeUnknown)
          throw new RecoveryError(error.code, true)
        throw error
      }
      throw new RecoveryError("network", writing)
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener("abort", cancel)
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort)
      this.pending.delete(kind)
    }
  }

  async mrfSummary(cursor?: string, signal?: AbortSignal): Promise<MrfObservation> {
    const result = observation(await this.request("summary", 4, MRF_ROOT, cursor ? { cursor } : {}, signal), "summary")
    requireValue(!cursor || result.nextCursor !== cursor, "pagination")
    return result
  }

  async mrfList(cursor?: string, limit = 100, signal?: AbortSignal): Promise<MrfObservation> {
    requireValue(Number.isInteger(limit) && limit >= 1 && limit <= 256, "invalid-input")
    const result = observation(
      await this.request(
        "list",
        4,
        `${MRF_ROOT}/responsibilities`,
        { limit: String(limit), ...(cursor ? { cursor } : {}) },
        signal,
      ),
      "list",
    )
    requireValue(!cursor || result.nextCursor !== cursor, "pagination")
    requireValue(
      result.nodes.every(
        (node) => node.reply?.result !== "list" || node.reply.snapshot.responsibilities.length <= limit,
      ),
    )
    return result
  }

  async mrfGet(node: string, id: string, signal?: AbortSignal): Promise<MrfObservation> {
    requireValue(nodeId(node) && uuid(id), "invalid-input")
    return observation(await this.request("get", 4, `${MRF_ROOT}/responsibilities/${node}/${id}`, {}, signal), "get", {
      node,
      id,
    })
  }

  async mrfAction(action: MrfAction): Promise<MrfObservation> {
    const request = action.request
    requireValue(
      nodeId(action.nodeId) &&
        uuid(request.responsibilityId) &&
        ["refresh", "recheck", "acceptUnverifiedRisk"].includes(request.action),
      "invalid-input",
    )
    requireValue(nullable(request.expectedBucketIncarnationId, uuid), "invalid-input")
    if (request.action !== "refresh") requireValue(uuid(request.expectedBucketIncarnationId), "invalid-input")
    if (request.action === "acceptUnverifiedRisk")
      requireValue(
        request.acknowledgeUnverifiedDataRisk === true &&
          uuid(request.requestId) &&
          !!request.reason?.trim() &&
          !!request.reference?.trim(),
        "invalid-input",
      )
    const result = await this.request("action", 4, `${MRF_ROOT}/responsibilities/actions`, {}, undefined, action)
    try {
      const value = observation(result, "action", {
        node: action.nodeId,
        id: request.responsibilityId,
        state: { refresh: "refreshed", recheck: "active", acceptUnverifiedRisk: "operatorAcceptedUnverified" }[
          request.action
        ],
      })
      requireValue(value.pageComplete && value.nodes[0].state === "ok")
      return value
    } catch {
      throw new RecoveryError("invalid-response", true)
    }
  }

  async integrityJob(bucket: string, id: string, signal?: AbortSignal): Promise<IntegrityJob> {
    requireValue(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) && uuid(id), "invalid-input")
    return integrityJob(
      await this.request("job", 3, `/integrity/${encodeURIComponent(bucket)}/jobs/${id}`, {}, signal),
      bucket,
      id,
    )
  }

  async integrityReadiness(signal?: AbortSignal): Promise<IntegrityReadiness> {
    const value = record(await this.request("readiness", 3, "/integrity/readiness", {}, signal))
    requireValue(
      [
        "local_reader_supported",
        "write_requested",
        "fleet_operator_attested",
        "new_writes_enabled_here",
        "fleet_capability_verified",
      ].every((key) => typeof value[key] === "boolean") && strings(value.unverified_requirements),
    )
    return value as unknown as IntegrityReadiness
  }

  async importReceipt(value: unknown, signal?: AbortSignal): Promise<IntegrityJob> {
    const receipt = parseRecoveryReceipt(value, this.endpoint)
    const job = await this.integrityJob(receipt.job.bucket, receipt.job.id, signal)
    requireValue(
      job.bucket_incarnation.toLowerCase() === receipt.job.bucket_incarnation.toLowerCase() &&
        sameRequest(job.request, receipt.job.request),
      "receipt-mismatch",
    )
    return job
  }
}
