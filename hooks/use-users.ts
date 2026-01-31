"use client"

import { useApi } from "@/contexts/api-context"

export function useUsers() {
  const api = useApi()

  const listUsers = async () => {
    return api.get("/list-users")
  }

  const createUser = async (data: Record<string, unknown>) => {
    const { accessKey, ...rest } = data
    return api.put(
      `/add-user?accessKey=${encodeURIComponent(accessKey as string)}`,
      rest
    )
  }

  const getUser = async (name: string) => {
    return api.get(`/user-info?accessKey=${encodeURIComponent(name)}`)
  }

  const updateUser = async (name: string, data: Record<string, unknown>) => {
    return api.put(`/user/${encodeURIComponent(name)}`, data)
  }

  const changeUserStatus = async (
    name: string,
    data: { status: string }
  ) => {
    return api.put(
      `/set-user-status?accessKey=${encodeURIComponent(name)}&status=${data.status}`,
      data
    )
  }

  const deleteUser = async (name: string) => {
    return api.delete(`/remove-user?accessKey=${encodeURIComponent(name)}`, {})
  }

  const updateUserGroups = async (
    name: string,
    data: Record<string, unknown>
  ) => {
    return api.put(`/user/${encodeURIComponent(name)}/groups`, data)
  }

  const getUserPolicy = async () => {
    return api.get("/user/policy")
  }

  const getSaUserPolicy = async (name: string) => {
    return api.get(`/user/${encodeURIComponent(name)}/policies`)
  }

  const setPolicy = async (data: Record<string, unknown>) => {
    return api.put("/set-policy", data)
  }

  const listAllUserServiceAccounts = async (name: string) => {
    return api.get(
      `/user/${encodeURIComponent(name)}/service-accounts`
    )
  }

  const createAUserServiceAccount = async (
    name: string,
    data: Record<string, unknown>
  ) => {
    return api.post(
      `/user/${encodeURIComponent(name)}/service-accounts`,
      data
    )
  }

  const createServiceAccountCredentials = async (
    name: string,
    data: Record<string, unknown>
  ) => {
    return api.post(
      `/user/${encodeURIComponent(name)}/service-account-credentials`,
      data
    )
  }

  const isAdminUser = async () => {
    return api.get("/is-admin") as Promise<{ is_admin?: boolean }>
  }

  return {
    listUsers,
    createUser,
    getUser,
    deleteUser,
    changeUserStatus,
    updateUser,
    updateUserGroups,
    getUserPolicy,
    setPolicy,
    getSaUserPolicy,
    listAllUserServiceAccounts,
    createAUserServiceAccount,
    createServiceAccountCredentials,
    isAdminUser,
  }
}
