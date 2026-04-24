export function buildListUserServiceAccountsRequest(userName: string) {
  return {
    url: "/list-service-accounts",
    params: { user: userName },
  }
}

export function buildCreateUserServiceAccountRequest(userName: string, data: Record<string, unknown>) {
  return {
    url: "/add-service-account",
    body: {
      targetUser: userName,
      ...data,
    },
  }
}
