export type BucketVersioningState = "unknown" | "enabled" | "disabled"

export function resolveBucketVersioningState(status?: string | null): BucketVersioningState {
  return status === "Enabled" ? "enabled" : "disabled"
}

export function shouldShowDeleteAllVersions(state: BucketVersioningState): boolean {
  return state === "enabled"
}

export function shouldDeleteAllVersions(state: BucketVersioningState, deleteAllVersions: boolean): boolean {
  return state === "enabled" && deleteAllVersions
}
