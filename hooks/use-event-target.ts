"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export function useEventTarget() {
  const api = useApi()

  const getEventsTargetList = useCallback(async () => {
    return api.get("/target/list") as Promise<{
      notification_endpoints?: Array<{
        account_id: string
        service: string
        status: string
      }>
    }>
  }, [api])

  const updateEventTarget = useCallback(
    async (
      targetType: string,
      targetName: string,
      targetData: Record<string, unknown>
    ) => {
      return api.put(
        `/target/${targetType}/${targetName}`,
        targetData
      )
    },
    [api]
  )

  const deleteEventTarget = useCallback(
    async (targetType: string, targetName: string) => {
      return api.delete(`/target/${targetType}/${targetName}/reset`)
    },
    [api]
  )

  const getEventTargetArnList = useCallback(async () => {
    return api.get("/target/arns")
  }, [api])

  return {
    getEventsTargetList,
    updateEventTarget,
    deleteEventTarget,
    getEventTargetArnList,
  }
}
