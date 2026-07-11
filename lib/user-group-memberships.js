export function buildAddUsersToGroupsRequests(users, groups) {
  const normalizedUsers = Array.from(new Set(users.map((user) => user.trim()).filter(Boolean)))
  const normalizedGroups = Array.from(new Set(groups.map((group) => group.trim()).filter(Boolean)))
  if (!normalizedUsers.length) return []

  return normalizedGroups.map((group) => ({
    group,
    members: normalizedUsers,
    isRemove: false,
    groupStatus: "enabled",
  }))
}
