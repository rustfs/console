export interface AccountDisplayIdentity {
  access_key: string
  username?: string
  email?: string
}

/** Resolve display-only identity metadata without changing the account principal. */
export function resolveAccountDisplayName(identity: AccountDisplayIdentity): string {
  return (
    [identity.username, identity.email, identity.access_key]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0)
      ?.trim() ?? ""
  )
}
