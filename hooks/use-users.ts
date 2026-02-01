"use client"

import { useCallback } from "react"
import { useApiOptional } from "@/contexts/api-context"

export function useUsers() {
  const api = useApiOptional()

  const listUsers = useCallback(async () => {
    if (!api) return null
    return api.get("/list-users")
  }, [api])

  const createUser = useCallback(
    async (data: Record<string, unknown>) => {
      if (!api) return null
      const { accessKey, ...rest } = data
      return api.put(
        `/add-user?accessKey=${encodeURIComponent(accessKey as string)}`,
        rest
      )
    },
    [api]
  )

  const getUser = useCallback(
    async (name: string) => {
      if (!api) return null
      return api.get(`/user-info?accessKey=${encodeURIComponent(name)}`)
    },
    [api]
  )

  const updateUser = useCallback(
    async (name: string, data: Record<string, unknown>) => {
      if (!api) return null
      return api.put(`/user/${encodeURIComponent(name)}`, data)
    },
    [api]
  )

  const changeUserStatus = useCallback(
    async (name: string, data: { status: string }) => {
      if (!api) return null
      return api.put(
        `/set-user-status?accessKey=${encodeURIComponent(name)}&status=${data.status}`,
        data
      )
    },
    [api]
  )

  const deleteUser = useCallback(
    async (name: string) => {
      if (!api) return null
      return api.delete(`/remove-user?accessKey=${encodeURIComponent(name)}`, {})
    },
    [api]
  )

  const updateUserGroups = useCallback(
    async (name: string, data: Record<string, unknown>) => {
      if (!api) return null
      return api.put(`/user/${encodeURIComponent(name)}/groups`, data)
    },
    [api]
  )

  const getUserPolicy = useCallback(async () => {
    if (!api) return null
    return api.get("/user/policy")
  }, [api])

  const getSaUserPolicy = useCallback(
    async (name: string) => {
      if (!api) return null
      return api.get(`/user/${encodeURIComponent(name)}/policies`)
    },
    [api]
  )

  const setPolicy = useCallback(
    async (data: Record<string, unknown>) => {
      if (!api) return null
      return api.put("/set-policy", data)
    },
    [api]
  )

  const listAllUserServiceAccounts = useCallback(
    async (name: string) => {
      if (!api) return null
      return api.get(`/user/${encodeURIComponent(name)}/service-accounts`)
    },
    [api]
  )

  const createAUserServiceAccount = useCallback(
    async (name: string, data: Record<string, unknown>) => {
      if (!api) return null
      return api.post(
        `/user/${encodeURIComponent(name)}/service-accounts`,
        data
      )
    },
    [api]
  )

  const createServiceAccountCredentials = useCallback(
    async (name: string, data: Record<string, unknown>) => {
      if (!api) return null
      return api.post(
        `/user/${encodeURIComponent(name)}/service-account-credentials`,
        data
      )
    },
    [api]
  )

  const isAdminUser = useCallback(async () => {
    if (!api) return null
    return api.get("/is-admin") as Promise<{ is_admin?: boolean }>
  }, [api])

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
