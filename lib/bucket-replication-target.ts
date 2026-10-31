// list-remote-targets encodes a target with madmin's JSON tags: the bandwidth
// limit is `bandwidthlimit` (bytes per second) and `healthCheckDuration` is a
// Go time.Duration in nanoseconds. RustFS versions before that encoding
// returned `bandwidth_limit` and seconds. A stored 0 is a real value
// (unlimited bandwidth, default health check) and is distinct from a target
// that does not report the field at all.

export interface RemoteTargetLimits {
  bandwidthlimit?: number
  bandwidth_limit?: number
  healthCheckDuration?: number
}

// Mirrors the server's own secs-or-nanos heuristic: values below this are
// seconds, anything larger is nanoseconds.
const NANOS_THRESHOLD = 10_000_000
const BANDWIDTH_UNITS = ["Gi", "Mi", "Ki"] as const
const DEFAULT_BANDWIDTH = { bandwidth: 100, unit: "Gi" }

export function remoteTargetHealthCheckSeconds(target: RemoteTargetLimits | null | undefined): number | undefined {
  const raw = target?.healthCheckDuration
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return undefined
  return raw < NANOS_THRESHOLD ? raw : Math.round(raw / 1e9)
}

export function remoteTargetBandwidthLimit(target: RemoteTargetLimits | null | undefined): number | undefined {
  const raw = target?.bandwidthlimit ?? target?.bandwidth_limit
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return undefined
  return raw
}

// Form representation of a bytes-per-second limit: an unreported limit shows
// the new-target default, a stored 0 shows as 0.
export function bytesToBandwidth(bytes: number | undefined): { bandwidth: number; unit: string } {
  if (bytes === undefined) return DEFAULT_BANDWIDTH
  if (bytes <= 0) return { bandwidth: 0, unit: "Gi" }
  for (const unit of BANDWIDTH_UNITS) {
    const factor = unit === "Gi" ? 1024 ** 3 : unit === "Mi" ? 1024 ** 2 : 1024
    if (bytes % factor === 0) return { bandwidth: bytes / factor, unit }
  }
  return { bandwidth: Math.max(1, Math.round(bytes / 1024)), unit: "Ki" }
}
