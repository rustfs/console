"use client"

import { useApi } from "@/contexts/api-context"

export function useAccessKeys() {
  const api = useApi()

  const listUserServiceAccounts = async (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString()
    const url = query ? `/list-service-accounts?${query}` : "/list-service-accounts"
    return api.get(url)
  }

  const createServiceAccount = async (data: Record<string, unknown>) => {
    return api.put("/add-service-accounts", data)
  }

  const getServiceAccount = async (name: string) => {
    return api.get(`/info-service-account?accessKey=${encodeURIComponent(name)}`)
  }

  const updateServiceAccount = async (name: string, data: Record<string, unknown>) => {
    return api.post(`/update-service-account?accessKey=${encodeURIComponent(name)}`, data)
  }

  const deleteServiceAccount = async (name: string) => {
    return api.delete(`/delete-service-accounts?accessKey=${encodeURIComponent(name)}`)
  }

  const createServiceAccountCreds = async (data: Record<string, unknown>) => {
    return api.post("/service-account-credentials", data)
  }

  return {
    listUserServiceAccounts,
    createServiceAccount,
    deleteServiceAccount,
    createServiceAccountCreds,
    updateServiceAccount,
    getServiceAccount,
  }
}
