const BUCKET_NAME_MIN_LENGTH = 3
const BUCKET_NAME_MAX_LENGTH = 63
const UPPERCASE_BUCKET_NAME_PATTERN = /[A-Z]/

export function getBucketNameError(name: string): string | null {
  const trimmedName = name.trim()

  if (trimmedName.length < BUCKET_NAME_MIN_LENGTH || trimmedName.length > BUCKET_NAME_MAX_LENGTH) {
    return "Bucket names must be 3-63 characters long"
  }

  if (UPPERCASE_BUCKET_NAME_PATTERN.test(trimmedName)) {
    return "Bucket names must not contain uppercase letters"
  }

  return null
}

export function getOptionalBucketNameError(name: string): string | null {
  if (!name.trim()) {
    return null
  }

  return getBucketNameError(name)
}

export function isBucketNameValid(name: string): boolean {
  return getBucketNameError(name) === null
}
