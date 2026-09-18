"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export function useEventTarget() {
  const api = useApi()

  const getEventsTargetList = useCallback(async () => {
    return api.get("/target/list") as Promise<{
      notify_enabled?: unknown
      notification_endpoints?: Array<{
        account_id: string
        service: string
        status: string
        source?: string
      }>
    }>
  }, [api])

  const updateEventTarget = useCallback(
    async (targetType: string, targetName: string, targetData: Record<string, unknown>) => {
      return api.put(`/target/${targetType}/${targetName}`, targetData)
    },
    [api],
  )

  const deleteEventTarget = useCallback(
    async (targetType: string, targetName: string) => {
      return api.delete(`/target/${targetType}/${targetName}/reset`)
    },
    [api],
  )

  const getEventTargetArnList = useCallback(async () => {
    return api.get("/target/arns")
  }, [api])

  const getEventTargetSubscriptions = useCallback(
    async (targetType: string, targetName: string) => {
      return api.get(
        `/target/${encodeURIComponent(targetType)}/${encodeURIComponent(targetName)}/subscriptions`,
      ) as Promise<
        Array<{
          bucket: string
          id?: string
          events: string[]
          prefix?: string
          suffix?: string
        }>
      >
    },
    [api],
  )

  return {
    getEventsTargetList,
    updateEventTarget,
    deleteEventTarget,
    getEventTargetArnList,
    getEventTargetSubscriptions,
  }
}
