"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export function usePolicies() {
  const api = useApi()

  const listPolicies = useCallback(async () => api.get("/list-canned-policies"), [api])

  const addPolicy = useCallback(
    async (name: string, data: unknown) => api.put(`/add-canned-policy?name=${encodeURIComponent(name)}`, data),
    [api],
  )

  const getPolicy = useCallback(
    async (policyName: string) => api.get(`/info-canned-policy?name=${encodeURIComponent(policyName)}`),
    [api],
  )

  const removePolicy = useCallback(
    async (policyName: string) => api.delete(`/remove-canned-policy?name=${encodeURIComponent(policyName)}`),
    [api],
  )

  const listUsersForPolicy = useCallback(
    async (policyName: string) => api.get(`/policy/${encodeURIComponent(policyName)}/users`),
    [api],
  )

  const listGroupsForPolicy = useCallback(async () => api.get("/groups"), [api])

  const setPolicyMultiple = useCallback(
    async (data: Record<string, unknown>) => api.put("/set-policy-multi", data),
    [api],
  )

  const setUserOrGroupPolicy = useCallback(
    async (data: { policyName?: string[]; userOrGroup?: string; isGroup?: boolean }) => {
      const uniquePolicies = data.policyName ? Array.from(new Set(data.policyName)) : undefined
      const params: Record<string, string> = {}
      if (uniquePolicies?.length) params.policyName = uniquePolicies.join(",")
      if (data.userOrGroup) params.userOrGroup = data.userOrGroup
      if (data.isGroup !== undefined) params.isGroup = String(data.isGroup)
      return api.put("/set-user-or-group-policy", {}, { params })
    },
    [api],
  )

  const getPolicyByUserName = useCallback(
    async (userName: string) => {
      const userInfo = (await api.get(`/user-info?accessKey=${encodeURIComponent(userName)}`)) as {
        policyName?: string
        memberOf?: string[]
      }

      const directPolicyNames = userInfo?.policyName?.split(",").filter(Boolean) ?? []
      const memberOf = userInfo?.memberOf ?? []
      const groupPoliciesMap: Record<string, string[]> = {}

      if (memberOf.length > 0) {
        await Promise.all(
          memberOf.map(async (groupName) => {
            const groupInfo = (await api.get(`/group?group=${encodeURIComponent(groupName)}`)) as { policy?: string }
            const groupPolicyNames = groupInfo.policy?.split(",").filter(Boolean) ?? []
            if (groupPolicyNames.length > 0) {
              groupPoliciesMap[groupName] = groupPolicyNames
            }
          }),
        )
      }

      const allPolicyNames = new Set<string>()
      directPolicyNames.forEach((policyName) => allPolicyNames.add(policyName))
      Object.values(groupPoliciesMap).forEach((policyNames) => {
        policyNames.forEach((policyName) => allPolicyNames.add(policyName))
      })

      const policyStatement: Record<string, unknown>[] = []

      if (allPolicyNames.size > 0) {
        await Promise.all(
          Array.from(allPolicyNames).map(async (policyName) => {
            const policyInfo = (await getPolicy(policyName)) as { policy?: string }
            const policyDocument = JSON.parse(policyInfo.policy ?? "{}") as {
              Statement?: Record<string, unknown>[]
            }

            if (!Array.isArray(policyDocument.Statement)) return

            const groupOrigins = Object.entries(groupPoliciesMap)
              .filter(([, policies]) => policies.includes(policyName))
              .map(([groupName]) => groupName)

            policyDocument.Statement.forEach((statement) => {
              policyStatement.push({
                ...statement,
                Sid: statement.Sid ?? policyName,
                Origin: {
                  type:
                    directPolicyNames.includes(policyName) && groupOrigins.length > 0
                      ? "both"
                      : directPolicyNames.includes(policyName)
                        ? "direct"
                        : "group",
                  groups: groupOrigins,
                  policyName,
                },
              })
            })
          }),
        )
      }

      return {
        ID: "",
        Version: "2012-10-17",
        Statement: policyStatement,
      }
    },
    [api, getPolicy],
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
    getPolicyByUserName,
  }
}
