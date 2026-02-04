"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export function useAccessKeys() {
  const api = useApi()

  const listUserServiceAccounts = useCallback(
    async (params: Record<string, string> = {}) => {
      const query = new URLSearchParams(params).toString()
      const url = query ? `/list-service-accounts?${query}` : "/list-service-accounts"
      return api.get(url)
    },
    [api],
  )

  const createServiceAccount = useCallback(
    async (data: Record<string, unknown>) => {
      return api.put("/add-service-accounts", data)
    },
    [api],
  )

  const getServiceAccount = useCallback(
    async (name: string) => {
      return api.get(`/info-service-account?accessKey=${encodeURIComponent(name)}`)
    },
    [api],
  )

  const updateServiceAccount = useCallback(
    async (name: string, data: Record<string, unknown>) => {
      return api.post(`/update-service-account?accessKey=${encodeURIComponent(name)}`, data)
    },
    [api],
  )

  const deleteServiceAccount = useCallback(
    async (name: string) => {
      return api.delete(`/delete-service-accounts?accessKey=${encodeURIComponent(name)}`)
    },
    [api],
  )

  const createServiceAccountCreds = useCallback(
    async (data: Record<string, unknown>) => {
      return api.post("/service-account-credentials", data)
    },
    [api],
  )

  return {
    listUserServiceAccounts,
    createServiceAccount,
    deleteServiceAccount,
    createServiceAccountCreds,
    updateServiceAccount,
    getServiceAccount,
  }
}
