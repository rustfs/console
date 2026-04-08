export type BucketVersioningState = "unknown" | "enabled" | "disabled"

export function resolveBucketVersioningState(status?: string | null): BucketVersioningState {
  return status === "Enabled" ? "enabled" : "disabled"
}

export function shouldShowDeleteAllVersions(state: BucketVersioningState): boolean {
  return state === "enabled"
}

export function shouldForceDeleteObjects(state: BucketVersioningState, deleteAllVersions: boolean): boolean {
  if (state === "enabled") {
    return deleteAllVersions
  }

  return true
}
