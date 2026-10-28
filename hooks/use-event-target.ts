"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"
import {
  buildEventTargetInstanceUrl,
  buildEventTargetSubscriptionsPath,
  buildEventTargetUpdatePayload,
} from "@/lib/event-target-api"

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

  const getEventTargetInstance = useCallback(
    async (service: string, targetName: string) => {
      return api.get(buildEventTargetInstanceUrl(api.resolveUrl(""), service, targetName), {
        dedupe: false,
      }) as Promise<unknown>
    },
    [api],
  )

  const updateEventTargetInstance = useCallback(
    async (
      service: string,
      targetName: string,
      config: Record<string, string>,
      expectedConfig: Record<string, string>,
      expectedRevision: string,
    ) => {
      return api.put(
        buildEventTargetInstanceUrl(api.resolveUrl(""), service, targetName),
        buildEventTargetUpdatePayload(config, expectedConfig, expectedRevision),
      )
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
    async (service: string, targetName: string) => {
      return api.get(buildEventTargetSubscriptionsPath(service, targetName)) as Promise<
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
    getEventTargetInstance,
    updateEventTargetInstance,
    deleteEventTarget,
    getEventTargetArnList,
    getEventTargetSubscriptions,
  }
}
