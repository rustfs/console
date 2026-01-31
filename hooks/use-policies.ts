"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export function usePolicies() {
  const api = useApi()

  const listPolicies = useCallback(async () => api.get("/list-canned-policies"), [api])

  const addPolicy = useCallback(
    async (name: string, data: unknown) =>
      api.put(`/add-canned-policy?name=${encodeURIComponent(name)}`, data),
    [api]
  )

  const getPolicy = useCallback(
    async (policyName: string) =>
      api.get(`/info-canned-policy?name=${encodeURIComponent(policyName)}`),
    [api]
  )

  const removePolicy = useCallback(
    async (policyName: string) =>
      api.delete(`/remove-canned-policy?name=${encodeURIComponent(policyName)}`),
    [api]
  )

  const listUsersForPolicy = useCallback(
    async (policyName: string) =>
      api.get(`/policy/${encodeURIComponent(policyName)}/users`),
    [api]
  )

  const listGroupsForPolicy = useCallback(async () => api.get("/groups"), [api])

  const setPolicyMultiple = useCallback(
    async (data: Record<string, unknown>) => api.put("/set-policy-multi", data),
    [api]
  )

  const setUserOrGroupPolicy = useCallback(
    async (data: {
      policyName?: string[]
      userOrGroup?: string
      isGroup?: boolean
    }) => {
      const uniquePolicies = data.policyName
        ? Array.from(new Set(data.policyName))
        : undefined
      const params: Record<string, string> = {}
      if (uniquePolicies?.length) params.policyName = uniquePolicies.join(",")
      if (data.userOrGroup) params.userOrGroup = data.userOrGroup
      if (data.isGroup !== undefined) params.isGroup = String(data.isGroup)
      return api.put("/set-user-or-group-policy", {}, { params })
    },
    [api]
  )

  return {
    listPolicies,
    getPolicy,
    addPolicy,
    removePolicy,
    listUsersForPolicy,
    listGroupsForPolicy,
    setPolicyMultiple,
    setUserOrGroupPolicy,
  }
}
