export function buildAddUsersToGroupsRequests(users, groups) {
  const normalizedUsers = users.map((user) => user.trim()).filter(Boolean)
  const normalizedGroups = groups.map((group) => group.trim()).filter(Boolean)

  return normalizedUsers.flatMap((user) =>
    normalizedGroups.map((group) => ({
      group,
      members: [user],
      isRemove: false,
      groupStatus: "enabled",
    })),
  )
}
