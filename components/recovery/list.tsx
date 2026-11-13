"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { RiArrowRightLine, RiListCheck, RiRefreshLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/data-table"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useDataTable } from "@/hooks/use-data-table"
import { useMrfList } from "@/hooks/use-recovery"
import { groupMrfResponsibilities } from "@/lib/recovery"
import type { MrfGroup } from "@/types/recovery"
import { MrfStatus, ObservationCoverage, RecoveryFailure } from "./status"

export type MrfTarget = MrfGroup["responsibilities"][number]

function GroupIdentity({ group }: { group: MrfGroup }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 flex-col gap-1 text-xs">
      <span className="break-all">
        {t("Version slot")}: <span className="font-mono">{group.versionId ?? t("Null / unversioned slot")}</span>
      </span>
      <span className="break-all text-muted-foreground">
        {t("Source bucket identity")}:{" "}
        <span className="font-mono">{group.sourceBucketIncarnationId ?? t("Unknown")}</span>
      </span>
    </div>
  )
}

function GroupResponsibilities({ group, onInspect }: { group: MrfGroup; onInspect: (target: MrfTarget) => void }) {
  const { t } = useTranslation()
  return (
    <ul className="flex min-w-0 flex-col gap-3 whitespace-normal">
      {group.responsibilities.map((target) => (
        <li
          key={`${target.nodeId}:${target.responsibility.responsibilityId}`}
          className="flex min-w-0 flex-wrap items-center justify-between gap-3"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="break-all text-xs">{target.host}</span>
            <MrfStatus status={target.responsibility.status} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 shrink-0 sm:min-h-0"
            onClick={() => onInspect(target)}
            aria-label={t("View responsibility on {node}", { node: target.host })}
          >
            {t("View details")}
          </Button>
        </li>
      ))}
    </ul>
  )
}

export function RecoveryList({ enabled, onInspect }: { enabled: boolean; onInspect: (target: MrfTarget) => void }) {
  const { t } = useTranslation()
  const list = useMrfList({ enabled })
  const groups = useMemo(() => (list.data ? groupMrfResponsibilities(list.data) : []), [list.data])
  const known = groups.filter((group) => group.sourceBucketIncarnationId !== null).length
  const unknown = groups.filter((group) => group.sourceBucketIncarnationId === null).length
  const columns = useMemo<ColumnDef<MrfGroup>[]>(
    () => [
      {
        id: "object",
        header: t("Object"),
        cell: ({ row }) => (
          <div className="flex min-w-0 max-w-sm flex-col gap-2 whitespace-normal">
            <span className="text-xs text-muted-foreground break-all">{row.original.bucket}</span>
            <span className="break-all font-mono text-sm">{row.original.object}</span>
            <GroupIdentity group={row.original} />
          </div>
        ),
      },
      {
        id: "responsibilities",
        header: t("Responsibilities by node"),
        cell: ({ row }) => <GroupResponsibilities group={row.original} onInspect={onInspect} />,
      },
    ],
    [onInspect, t],
  )
  const { table } = useDataTable({ data: groups, columns, disablePagination: true, getRowId: (row) => row.id })
  if (!enabled) return null
  return (
    <section aria-labelledby="recovery-list-title" className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="recovery-list-title" className="text-lg font-semibold">
          {t("Unverified responsibilities")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={list.data ? "outline" : "default"}
            disabled={list.loading}
            onClick={() => void list.load()}
            className="min-h-11 sm:min-h-0"
          >
            {list.loading ? (
              <Spinner data-icon="inline-start" />
            ) : list.data ? (
              <RiRefreshLine data-icon="inline-start" />
            ) : (
              <RiListCheck data-icon="inline-start" />
            )}
            {t(list.data ? "Restart observation" : "Load responsibilities")}
          </Button>
          {list.data?.nextCursor && (
            <Button
              type="button"
              variant="outline"
              disabled={list.loading}
              onClick={() => void list.load(list.data?.nextCursor ?? undefined)}
              className="min-h-11 sm:min-h-0"
            >
              {t("Next page")}
              <RiArrowRightLine data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {t(
          "Historical responsibilities refer to their source bucket identity and version slot. They do not establish the health of a current object with the same name.",
        )}
      </p>
      {list.error && <RecoveryFailure error={list.error} onRetry={() => void list.refresh()} />}
      {list.stale && list.data && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("Previous observation · may be stale")}
        </p>
      )}
      {list.data && (
        <>
          <ObservationCoverage data={list.data} />
          <p className="text-xs text-muted-foreground">
            {t(
              "This page: {known} observed object/version slots with known source identity; {unknown} responsibilities with unknown source, shown separately.",
              { known, unknown },
            )}
          </p>
        </>
      )}
      {!list.data && list.error ? null : !list.data && !list.loading ? (
        <EmptyState
          title={t("Details load on request")}
          description={t(
            "Load one bounded page to inspect retained responsibilities. No object content is read by this view.",
          )}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable
              table={table}
              caption={t("Unverified responsibilities by source identity and node")}
              isLoading={list.loading}
              keepPreviousData
              emptyTitle={t("No responsibilities observed on this page")}
              emptyDescription={t("Absence from this observation does not establish data integrity.")}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-4 md:hidden" aria-busy={list.loading}>
            {list.loading && !groups.length && (
              <div className="flex items-center gap-2 py-6" role="status">
                <Spinner />
                {t("Loading")}
              </div>
            )}
            {!list.loading && !groups.length && (
              <EmptyState
                title={t("No responsibilities observed on this page")}
                description={t("Absence from this observation does not establish data integrity.")}
              />
            )}
            {groups.map((group) => (
              <article key={group.id} className="flex min-w-0 flex-col gap-4 border p-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="break-all text-xs text-muted-foreground">{group.bucket}</span>
                  <h3 className="break-all font-mono text-sm font-medium">{group.object}</h3>
                </div>
                <GroupIdentity group={group} />
                <GroupResponsibilities group={group} onInspect={onInspect} />
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
