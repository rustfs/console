export interface PermissionResourceContext {
  bucket?: string
  objectKey?: string
  prefix?: string
}

const S3_ARN_PREFIX = "arn:aws:s3:::"

function normalizeS3Path(path: string): string {
  return path.replace(/^\/+/, "")
}

export function toBucketArn(bucket: string): string {
  return `${S3_ARN_PREFIX}${bucket}`
}

export function toObjectArn(bucket: string, objectKey: string): string {
  return `${toBucketArn(bucket)}/${normalizeS3Path(objectKey)}`
}

export function toObjectPatternArn(bucket?: string, prefix?: string): string {
  if (!bucket) {
    return `${S3_ARN_PREFIX}*`
  }

  if (!prefix) {
    return `${toBucketArn(bucket)}/*`
  }

  const normalizedPrefix = normalizeS3Path(prefix)
  return `${toBucketArn(bucket)}/${normalizedPrefix}*`
}

export function toAllBucketsArn(): string {
  return `${S3_ARN_PREFIX}*`
}
