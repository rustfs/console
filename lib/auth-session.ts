export interface SessionCredentials {
  AccessKeyId?: string
  SecretAccessKey?: string
  SessionToken?: string
  Expiration?: string
}

export function isValidCredentials(credentials: SessionCredentials | undefined, now = Date.now()): boolean {
  if (
    !credentials?.AccessKeyId ||
    !credentials.SecretAccessKey ||
    !credentials.SessionToken ||
    !credentials.Expiration
  ) {
    return false
  }
  const expiration = Date.parse(credentials.Expiration)
  return Number.isFinite(expiration) && expiration > now
}

export function isSameSession(current: SessionCredentials | undefined, expected: SessionCredentials): boolean {
  return (
    !!current?.AccessKeyId &&
    current.AccessKeyId === expected.AccessKeyId &&
    current.SecretAccessKey === expected.SecretAccessKey &&
    current.SessionToken === expected.SessionToken &&
    current.Expiration === expected.Expiration
  )
}

export function isSessionError(code: string | undefined): boolean {
  return ["invalidaccesskeyid", "expiredtoken", "unauthorizedaccess"].includes(code?.toLowerCase() ?? "")
}
