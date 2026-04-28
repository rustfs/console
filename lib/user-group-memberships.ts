export interface UpdateGroupMembersRequest {
  group: string
  members: string[]
  isRemove: boolean
  groupStatus: string
}

export function buildAddUsersToGroupsRequests(users: string[], groups: string[]): UpdateGroupMembersRequest[] {
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
