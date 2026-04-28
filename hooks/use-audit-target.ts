"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export function useAuditTarget() {
  const api = useApi()

  const getAuditTargetList = useCallback(async () => {
    return api.get("/audit/target/list") as Promise<{
      audit_endpoints?: Array<{
        account_id: string
        service: string
        status: string
        source?: string
      }>
    }>
  }, [api])

  const updateAuditTarget = useCallback(
    async (targetType: string, targetName: string, targetData: Record<string, unknown>) => {
      return api.put(`/audit/target/${targetType}/${targetName}`, targetData)
    },
    [api],
  )

  const deleteAuditTarget = useCallback(
    async (targetType: string, targetName: string) => {
      return api.delete(`/audit/target/${targetType}/${targetName}/reset`)
    },
    [api],
  )

  return {
    getAuditTargetList,
    updateAuditTarget,
    deleteAuditTarget,
  }
}
