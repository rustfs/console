export interface AccountDisplayIdentity {
  access_key: string
  username?: string
  email?: string
  display_name?: string
  picture?: string
}

function firstNonBlank(values: (string | undefined)[]): string {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? ""
}

/** Resolve display-only identity metadata without changing the account principal. */
export function resolveAccountDisplayName(identity: AccountDisplayIdentity): string {
  return firstNonBlank([identity.username, identity.email, identity.access_key])
}

/** Name for compact identity chrome (user menu): the full name from the identity provider when known. */
export function resolveAccountMenuName(identity: AccountDisplayIdentity): string {
  return firstNonBlank([identity.display_name, resolveAccountDisplayName(identity)])
}

/** Avatar URL from the identity provider, accepted only as an absolute https URL. */
export function resolveAccountAvatarUrl(identity: AccountDisplayIdentity): string | undefined {
  const picture = identity.picture?.trim()
  if (!picture) return undefined
  try {
    return new URL(picture).protocol === "https:" ? picture : undefined
  } catch {
    return undefined
  }
}
