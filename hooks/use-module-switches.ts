"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"
import type { ModuleSwitchPayload, ModuleSwitchSnapshot } from "@/lib/module-switches"

export function useModuleSwitches() {
  const api = useApi()

  const getModuleSwitches = useCallback(
    async (options?: { suppress403Redirect?: boolean }) => {
      return (await api.get("/module-switches", options)) as ModuleSwitchSnapshot
    },
    [api],
  )

  const saveModuleSwitches = useCallback(
    async (payload: ModuleSwitchPayload) => {
      return (await api.put("/module-switches", payload)) as ModuleSwitchSnapshot
    },
    [api],
  )

  return {
    getModuleSwitches,
    saveModuleSwitches,
  }
}
