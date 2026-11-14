export interface PermissionResourceContext {
  bucket?: string
  objectKey?: string
  prefix?: string
  versionId?: string
  targetObjectKey?: string
  keyId?: string
  retainUntilDate?: string
  retentionMode?: "GOVERNANCE" | "COMPLIANCE"
  legalHoldStatus?: "ON" | "OFF"
  requestTags?: Record<string, string>
  authType?: "REST-HEADER" | "REST-QUERY-STRING"
  operation?: "PutObject" | "CopyObject" | "CreateMultipartUpload" | "UploadPartCopy" | "CompleteMultipartUpload"
  /** Undefined facts are unknown; null records a header the SDK will not send. */
  copySource?: { bucket: string; objectKey: string; versionId?: string } | null
  ifMatch?: string | null
  ifNoneMatch?: string | null
}

const S3_ARN_PREFIX = "arn:aws:s3:::"

export function toBucketArn(bucket: string): string {
  return `${S3_ARN_PREFIX}${bucket}`
}

export function toObjectArn(bucket: string, objectKey: string): string {
  return `${toBucketArn(bucket)}/${objectKey}`
}

export function toObjectPatternArn(bucket?: string, prefix?: string): string {
  if (!bucket) {
    return `${S3_ARN_PREFIX}*`
  }

  if (!prefix) {
    return `${toBucketArn(bucket)}/*`
  }

  return `${toBucketArn(bucket)}/${prefix}*`
}

export function toAllBucketsArn(): string {
  return `${S3_ARN_PREFIX}*`
}
