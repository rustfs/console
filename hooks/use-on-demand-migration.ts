"use client"

import * as React from "react"
import { useApi } from "@/contexts/api-context"
import type {
  OnDemandMigrationBackfillRequest,
  OnDemandMigrationBackfillResponse,
  OnDemandMigrationConfig,
  OnDemandMigrationGetResponse,
  OnDemandMigrationSetResponse,
  OnDemandMigrationStatus,
} from "@/types/on-demand-migration"

const pathFor = (bucket: string) => `/on-demand-migration/${encodeURIComponent(bucket)}`
const requestOptions = { suppress403Redirect: true, dedupe: false } as const

export function useOnDemandMigration() {
  const api = useApi()

  return React.useMemo(
    () => ({
      getConfig: (bucket: string) => api.get(pathFor(bucket), requestOptions) as Promise<OnDemandMigrationGetResponse>,
      getStatus: (bucket: string) =>
        api.get(`${pathFor(bucket)}/status`, requestOptions) as Promise<OnDemandMigrationStatus>,
      setConfig: (bucket: string, config: OnDemandMigrationConfig, dryRun = false) =>
        api.put(pathFor(bucket), config, {
          ...requestOptions,
          params: dryRun ? { "dry-run": "true" } : undefined,
        }) as Promise<OnDemandMigrationSetResponse>,
      deleteConfig: (bucket: string) => api.delete(pathFor(bucket), requestOptions) as Promise<null>,
      getBackfill: (bucket: string) =>
        api.get(`${pathFor(bucket)}/backfill`, requestOptions) as Promise<OnDemandMigrationBackfillResponse>,
      startBackfill: (bucket: string, request: OnDemandMigrationBackfillRequest) =>
        api.post(`${pathFor(bucket)}/backfill`, request, {
          ...requestOptions,
          params: { op: "start" },
        }) as Promise<OnDemandMigrationBackfillResponse>,
      cancelBackfill: (bucket: string) =>
        api.post(`${pathFor(bucket)}/backfill`, undefined, {
          ...requestOptions,
          params: { op: "cancel" },
        }) as Promise<OnDemandMigrationBackfillResponse>,
    }),
    [api],
  )
}
