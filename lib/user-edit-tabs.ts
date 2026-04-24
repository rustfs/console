export type UserEditTab = "account" | "groups" | "policy" | "access-keys"

interface UserEditTabAvailability {
  canEditAccount: boolean
  canAssignGroups: boolean
  canEditPolicies: boolean
  canManageAccessKeys: boolean
}

export function getAvailableUserEditTabs({
  canEditAccount,
  canAssignGroups,
  canEditPolicies,
  canManageAccessKeys,
}: UserEditTabAvailability): UserEditTab[] {
  const tabs: UserEditTab[] = []

  if (canEditAccount) tabs.push("account")
  if (canAssignGroups) tabs.push("groups")
  if (canEditPolicies) tabs.push("policy")
  if (canManageAccessKeys) tabs.push("access-keys")

  return tabs
}
