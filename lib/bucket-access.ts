interface S3ServiceError {
  $metadata?: {
    httpStatusCode?: number
  }
  Code?: string
  name?: string
  message?: string
}

export function isMissingBucketError(error: unknown): boolean {
  const serviceError = error as S3ServiceError
  if (serviceError?.$metadata?.httpStatusCode === 404) return true

  const code = (serviceError?.Code ?? serviceError?.name ?? "").toLowerCase()
  return code === "nosuchbucket" || code === "notfound"
}
