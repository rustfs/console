"use client"

import { useApi } from "@/contexts/api-context"

export function usePolicies() {
  const api = useApi()

  const listPolicies = async () => api.get("/list-canned-policies")

  const addPolicy = async (name: string, data: unknown) =>
    api.put(`/add-canned-policy?name=${encodeURIComponent(name)}`, data)

  const getPolicy = async (policyName: string) =>
    api.get(`/info-canned-policy?name=${encodeURIComponent(policyName)}`)

  const removePolicy = async (policyName: string) =>
    api.delete(`/remove-canned-policy?name=${encodeURIComponent(policyName)}`)

  const listUsersForPolicy = async (policyName: string) =>
    api.get(`/policy/${encodeURIComponent(policyName)}/users`)

  const listGroupsForPolicy = async () => api.get("/groups")

  const setPolicyMultiple = async (data: Record<string, unknown>) => api.put("/set-policy-multi", data)

  const setUserOrGroupPolicy = async (data: Record<string, unknown>) =>
    api.put("/set-user-or-group-policy", {}, { params: data as Record<string, string> })

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
