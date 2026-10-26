"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  RiAddLine,
  RiArrowLeftRightLine,
  RiDeleteBin5Line,
  RiMore2Line,
  RiRefreshLine,
  RiRestartLine,
  RiUploadCloud2Line,
} from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { CopyButton } from "@/components/copy-button"
import { DataTable } from "@/components/data-table/data-table"
import { SiteReplicationEditForm } from "@/components/site-replication/edit-form"
import { SiteReplicationNewForm } from "@/components/site-replication/new-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useDataTable } from "@/hooks/use-data-table"
import { usePermissions } from "@/hooks/use-permissions"
import { useSiteReplication } from "@/hooks/use-site-replication"
import { useSystem } from "@/hooks/use-system"
import { formatDateTime, niceBytes } from "@/lib/functions"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { siteReplicationResyncAdvice } from "@/lib/site-replication-edit"
import { extractServerDeploymentId, resolveSiteReplicationLocalSite } from "@/lib/site-replication-local-site"
import { isHttpsSiteReplicationEndpoint } from "@/lib/site-replication-tls"
import type {
  SiteReplicationInfo,
  SiteReplicationPeerInfo,
  SiteReplicationResyncOperation,
  SiteReplicationStatus,
} from "@/types/site-replication"

const STATUS_QUERY = {
  buckets: "true",
  policies: "true",
  users: "true",
  groups: "true",
  metrics: "true",
  "peer-state": "true",
  "ilm-expiry-rules": "true",
}

function isNotImplementedError(error: unknown) {
  const message = (error as Error | undefined)?.message ?? ""
  return /notimplemented|not implemented/i.test(message)
}

function formatSyncBadge(t: (key: string) => string, syncState: SiteReplicationPeerInfo["syncState"]) {
  switch (syncState) {
    case "enable":
      return <Badge>{t("Enabled")}</Badge>
    case "disable":
      return <Badge variant="secondary">{t("Disabled")}</Badge>
    default:
      return <Badge variant="outline">{t("Unknown")}</Badge>
  }
}

function formatBandwidth(t: (key: string) => string, peer: SiteReplicationPeerInfo) {
  if (!peer.defaultBandwidth.set) {
    return t("Not configured")
  }

  return niceBytes(String(peer.defaultBandwidth.limit || 0))
}

function formatTlsVerification(t: (key: string) => string, peer: SiteReplicationPeerInfo) {
  if (!isHttpsSiteReplicationEndpoint(peer.endpoint)) {
    return <span className="text-muted-foreground">-</span>
  }

  if (peer.skipTlsVerify) {
    return <Badge variant="destructive">{t("Skip TLS verification")}</Badge>
  }

  if (peer.caCertPem) {
    return <Badge variant="secondary">{t("Custom CA certificate")}</Badge>
  }

  return <Badge variant="outline">{t("Default certificate verification")}</Badge>
}

function SummaryStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

export default function SiteReplicationPage() {
  const { t } = useTranslation()
  const dialog = useDialog()
  const message = useMessage()
  const { isAdmin, hasPermission } = usePermissions()
  const {
    getSiteReplicationInfo,
    getSiteReplicationStatus,
    removeSiteReplication,
    resyncSiteReplication,
    setSiteReplicationIlmExpiry,
  } = useSiteReplication()
  const { getSystemInfo } = useSystem()

  const [info, setInfo] = useState<SiteReplicationInfo | null>(null)
  const [status, setStatus] = useState<SiteReplicationStatus | null>(null)
  const [serverDeploymentId, setServerDeploymentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [featureUnavailable, setFeatureUnavailable] = useState(false)
  const [statusUnavailable, setStatusUnavailable] = useState(false)
  const [newFormOpen, setNewFormOpen] = useState(false)
  const [editingPeer, setEditingPeer] = useState<SiteReplicationPeerInfo | null>(null)
  const [pendingResyncDeploymentId, setPendingResyncDeploymentId] = useState("")
  const [pendingRemoveDeploymentId, setPendingRemoveDeploymentId] = useState("")
  const [pendingIlmToggle, setPendingIlmToggle] = useState(false)

  const canManageSites = isAdmin || hasPermission("admin:SiteReplicationAdd")
  const canRemoveSites = isAdmin || hasPermission("admin:SiteReplicationRemove")
  const canResyncSites = isAdmin || hasPermission("admin:SiteReplicationResync")

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFeatureUnavailable(false)
    setStatusUnavailable(false)

    // The local deployment ID is the only stable way to tell which entry of
    // the shared, deployment-ID-sorted site list belongs to this server. Fetch
    // it alongside the replication data; a failure here only degrades the
    // "current site" identification, so it must not fail the whole page.
    const serverDeploymentIdPromise = getSystemInfo(undefined, { suppress403Redirect: true })
      .then(extractServerDeploymentId)
      .catch(() => "")

    try {
      let nextInfo: SiteReplicationInfo | null = null
      let nextStatus: SiteReplicationStatus | null = null

      try {
        nextInfo = await getSiteReplicationInfo()
      } catch (loadError) {
        if (isNotImplementedError(loadError)) {
          setFeatureUnavailable(true)
          setInfo(null)
          setStatus(null)
          return
        }

        throw loadError
      }

      try {
        nextStatus = await getSiteReplicationStatus(STATUS_QUERY)
      } catch (loadError) {
        if (isNotImplementedError(loadError)) {
          setStatusUnavailable(true)
          nextStatus = null
        } else {
          throw loadError
        }
      }

      setServerDeploymentId(await serverDeploymentIdPromise)
      setInfo(nextInfo)
      setStatus(nextStatus)
    } catch (loadError) {
      setError((loadError as Error).message || t("Load Failed"))
    } finally {
      setLoading(false)
    }
  }, [getSiteReplicationInfo, getSiteReplicationStatus, getSystemInfo, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const peers = info?.sites ?? []
  const ilmExpiryEnabled = peers.some((peer) => peer.replicateIlmExpiry)
  // Never pick the local site by array or key position: every site returns
  // the same list in the same order (issue rustfs/rustfs#7072).
  const localSite = resolveSiteReplicationLocalSite({
    serverDeploymentId,
    localName: info?.name,
    peers,
  })
  const localDeploymentId = localSite.deploymentId
  const localPeer = peers.find((peer) => peer.deploymentId === localDeploymentId) ?? null
  const localSummary = (localDeploymentId && status?.statsSummary[localDeploymentId]) || null
  const localMetric = (localDeploymentId && status?.metrics.metrics[localDeploymentId]) || null

  const handleResync = useCallback(
    async (peer: SiteReplicationPeerInfo, operation: SiteReplicationResyncOperation) => {
      setPendingResyncDeploymentId(peer.deploymentId)
      try {
        const response = await resyncSiteReplication(operation, peer)

        if (response.status === "failed") {
          throw new Error(response.errorDetail || t("Operation Failed"))
        }

        const bucketFailures = response.buckets.filter((bucket) => bucket.status === "failed")
        if (bucketFailures.length > 0) {
          const firstFailure = bucketFailures[0]
          const failureMessage = firstFailure?.errorDetail || response.errorDetail || t("Operation Failed")
          message.error(failureMessage)
        } else {
          message.success(
            operation === "start"
              ? t("Resync request started successfully")
              : t("Resync cancel request sent successfully"),
          )
        }
      } catch (resyncError) {
        message.error((resyncError as Error).message || t("Operation Failed"))
      } finally {
        setPendingResyncDeploymentId("")
        await loadData()
      }
    },
    [loadData, message, resyncSiteReplication, t],
  )

  // Edits do not replay writes made while the old address was unreachable, so
  // an endpoint change is followed by the resync that recovers them.
  const handleEditSuccess = (peer: SiteReplicationPeerInfo, nextEndpoint: string) => {
    void loadData()

    const advice = siteReplicationResyncAdvice({
      isLocal: peer.deploymentId === localDeploymentId,
      previousEndpoint: peer.endpoint,
      nextEndpoint,
    })

    if (advice === "resync-from-peers") {
      dialog.warning({
        title: t("Resync Recommended"),
        content: t(
          "This site's address changed. Objects written on other sites while the old address was unreachable were not replicated here. Start a resync toward this site from each peer site's console.",
        ),
        positiveText: t("Close"),
      })
    } else if (advice === "resync-peer") {
      dialog.warning({
        title: t("Resync Recommended"),
        content: t(
          "The address of {name} changed. Objects written on this site while the old address was unreachable were not replicated to it. Run a resync for this site to copy them.",
          { name: peer.name || peer.endpoint },
        ),
        ...(canResyncSites
          ? {
              positiveText: t("Start Resync"),
              negativeText: t("Later"),
              onPositiveClick: () => void handleResync({ ...peer, endpoint: nextEndpoint }, "start"),
            }
          : { positiveText: t("Close") }),
      })
    }
  }

  const confirmRemoveSite = useCallback(
    (peer: SiteReplicationPeerInfo) => {
      dialog.error({
        title: t("Warning"),
        content: t("Are you sure you want to remove this site from the replication group?"),
        positiveText: t("Confirm"),
        negativeText: t("Cancel"),
        onPositiveClick: async () => {
          setPendingRemoveDeploymentId(peer.deploymentId)
          try {
            const response = await removeSiteReplication({ siteNames: [peer.name] })
            message.success(response.status || t("Delete Success"))
            await loadData()
          } catch (removeError) {
            message.error((removeError as Error).message || t("Delete Failed"))
          } finally {
            setPendingRemoveDeploymentId("")
          }
        },
      })
    },
    [dialog, loadData, message, removeSiteReplication, t],
  )

  const confirmRemoveAllSites = () => {
    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to remove all sites from site replication?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: async () => {
        setPendingRemoveDeploymentId("__all__")
        try {
          const response = await removeSiteReplication({ siteNames: [], removeAll: true })
          message.success(response.status || t("Delete Success"))
          await loadData()
        } catch (removeError) {
          message.error((removeError as Error).message || t("Delete Failed"))
        } finally {
          setPendingRemoveDeploymentId("")
        }
      },
    })
  }

  const confirmToggleIlmExpiry = (enabled: boolean) => {
    dialog.error({
      title: t("Warning"),
      content: enabled
        ? t("Enable ILM expiry rule replication for every site?")
        : t("Disable ILM expiry rule replication for every site?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: async () => {
        setPendingIlmToggle(true)
        try {
          const response = await setSiteReplicationIlmExpiry(enabled)
          if (!response.success) {
            throw new Error(response.errorDetail || response.status || t("Save Failed"))
          }
          message.success(response.status || t("Save Success"))
          await loadData()
        } catch (toggleError) {
          message.error((toggleError as Error).message || t("Save Failed"))
        } finally {
          setPendingIlmToggle(false)
        }
      },
    })
  }

  const columns: ColumnDef<SiteReplicationPeerInfo>[] = useMemo(
    () => [
      {
        id: "site",
        header: () => t("Site"),
        cell: ({ row }) => {
          const peer = row.original
          const isLocal = peer.deploymentId === localDeploymentId

          return (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{peer.name || t("Unnamed Site")}</span>
                {isLocal ? <Badge variant="secondary">{t("Current Site")}</Badge> : null}
              </div>
              <p className="text-xs text-muted-foreground">{peer.objectNamingMode || t("Peer site")}</p>
            </div>
          )
        },
      },
      {
        id: "endpoint",
        header: () => t("Endpoint"),
        accessorKey: "endpoint",
        cell: ({ row }) => <span className="font-mono text-xs break-all">{row.original.endpoint || "-"}</span>,
      },
      {
        id: "deploymentId",
        header: () => t("Deployment ID"),
        accessorKey: "deploymentId",
        cell: ({ row }) => <span className="font-mono text-xs break-all">{row.original.deploymentId || "-"}</span>,
      },
      {
        id: "tlsVerification",
        header: () => t("TLS Verification"),
        cell: ({ row }) => formatTlsVerification(t, row.original),
      },
      {
        id: "syncState",
        header: () => t("Sync"),
        accessorKey: "syncState",
        cell: ({ row }) => formatSyncBadge(t, row.original.syncState),
      },
      {
        id: "ilmExpiry",
        header: () => t("ILM Expiry"),
        cell: ({ row }) =>
          row.original.replicateIlmExpiry ? (
            <Badge>{t("Enabled")}</Badge>
          ) : (
            <Badge variant="outline">{t("Disabled")}</Badge>
          ),
      },
      {
        id: "bandwidth",
        header: () => t("Default Bandwidth"),
        cell: ({ row }) => formatBandwidth(t, row.original),
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        cell: ({ row }) => {
          const peer = row.original
          const isLocal = peer.deploymentId === localDeploymentId
          const isBusy =
            pendingRemoveDeploymentId === peer.deploymentId || pendingResyncDeploymentId === peer.deploymentId

          // The local site's stored endpoint is only inferred when replication
          // is set up, so it must stay editable for address changes; resync and
          // removal still only make sense for remote peers.
          if (isLocal && !canManageSites) {
            return <span className="text-xs text-muted-foreground">{t("Managed automatically")}</span>
          }

          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="ghost" size="icon" disabled={isBusy}>
                    <RiMore2Line className="size-4" aria-hidden />
                    <span className="sr-only">{t("Actions")}</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{peer.name || (isLocal ? t("Current Site") : t("Peer site"))}</DropdownMenuLabel>
                  {canManageSites ? (
                    <DropdownMenuItem onClick={() => setEditingPeer(peer)}>
                      <RiArrowLeftRightLine className="size-4" aria-hidden />
                      {t("Edit Site")}
                    </DropdownMenuItem>
                  ) : null}
                  {canResyncSites && !isLocal ? (
                    <DropdownMenuItem onClick={() => void handleResync(peer, "start")}>
                      <RiRestartLine className="size-4" aria-hidden />
                      {t("Start Resync")}
                    </DropdownMenuItem>
                  ) : null}
                  {canResyncSites && !isLocal ? (
                    <DropdownMenuItem onClick={() => void handleResync(peer, "cancel")}>
                      <RiRefreshLine className="size-4" aria-hidden />
                      {t("Cancel Resync")}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
                {canRemoveSites && !isLocal ? <DropdownMenuSeparator /> : null}
                {canRemoveSites && !isLocal ? (
                  <DropdownMenuItem variant="destructive" onClick={() => confirmRemoveSite(peer)}>
                    <RiDeleteBin5Line className="size-4" aria-hidden />
                    {t("Remove Site")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [
      canManageSites,
      canRemoveSites,
      canResyncSites,
      confirmRemoveSite,
      handleResync,
      localDeploymentId,
      pendingRemoveDeploymentId,
      pendingResyncDeploymentId,
      t,
    ],
  )

  const { table } = useDataTable<SiteReplicationPeerInfo>({
    data: peers,
    columns,
    getRowId: (row) => row.deploymentId || row.endpoint,
  })

  const showSetup = info?.enabled === false && peers.length === 0
  const remotePeers = peers.filter((peer) => !localDeploymentId || peer.deploymentId !== localDeploymentId)

  if (featureUnavailable && !loading) {
    return (
      <Page>
        <PageHeader
          actions={
            <Button
              type="button"
              variant="outline"
              className="inline-flex items-center gap-2"
              onClick={() => void loadData()}
            >
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          }
        >
          <h1 className="text-2xl font-bold">{t("Site Replication")}</h1>
        </PageHeader>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{t("Site Replication Is Not Available")}</CardTitle>
            <CardDescription>
              {t(
                "This server has not exposed the site replication API yet, so the page now shows a friendly fallback instead of a raw NotImplemented error.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t(
                "When the backend implements the site replication info endpoint, this page will automatically show peer sites, status summaries, and management actions.",
              )}
            </p>
          </CardContent>
        </Card>
      </Page>
    )
  }

  if (loading && !info && !status) {
    return (
      <Page>
        <PageHeader>
          <h1 className="text-2xl font-bold">{t("Site Replication")}</h1>
        </PageHeader>
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      </Page>
    )
  }

  if (error && !info && !status) {
    return (
      <Page>
        <PageHeader
          actions={
            <Button variant="outline" onClick={() => void loadData()}>
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          }
        >
          <h1 className="text-2xl font-bold">{t("Site Replication")}</h1>
        </PageHeader>

        <div className="rounded-none border border-destructive/40 bg-destructive/10 p-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        actions={
          <>
            {canManageSites && !showSetup ? (
              <Button type="button" className="inline-flex items-center gap-2" onClick={() => setNewFormOpen(true)}>
                <RiAddLine className="size-4" aria-hidden />
                <span>{t("Add Site")}</span>
              </Button>
            ) : null}
            {canRemoveSites && peers.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="inline-flex items-center gap-2"
                onClick={confirmRemoveAllSites}
                disabled={pendingRemoveDeploymentId === "__all__"}
              >
                <RiDeleteBin5Line className="size-4" aria-hidden />
                <span>{t("Remove All Sites")}</span>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="inline-flex items-center gap-2"
              onClick={() => void loadData()}
              disabled={loading}
            >
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Site Replication")}</h1>
      </PageHeader>

      {error ? (
        <div className="rounded-none border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : null}

      {statusUnavailable ? (
        <div className="rounded-none border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            {t(
              "Detailed site replication status is not available on this server yet. Basic peer information is still shown below.",
            )}
          </p>
        </div>
      ) : null}

      {showSetup ? (
        <section className="grid items-start gap-10 border-y py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="max-w-xl space-y-5">
            <Badge variant="outline">{t("Not configured")}</Badge>
            <h2 className="font-heading text-2xl font-semibold leading-snug">
              {t("Add a remote site to initialize site replication for this deployment.")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "The current site is detected automatically by the server. Add one or more remote sites to join the replication group.",
              )}
            </p>
            {canManageSites ? (
              <Button onClick={() => setNewFormOpen(true)}>
                <RiAddLine className="size-4" aria-hidden />
                {t("Add Site")}
              </Button>
            ) : null}
          </div>
          <dl className="space-y-6 bg-muted/30 p-6">
            <div>
              <dt className="text-xs text-muted-foreground">{t("Current Site")}</dt>
              <dd className="mt-2 break-all font-medium">{info?.name || t("Unknown")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Deployment ID")}</dt>
              <dd className="mt-2 break-all font-mono text-xs">{localDeploymentId || t("Unknown")}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <>
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <section className="site-topology border bg-card p-6" aria-label={t("Site Replication")}>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">{t("Current Site")}</p>
                {info?.enabled ? <Badge>{t("Enabled")}</Badge> : <Badge variant="outline">{t("Not configured")}</Badge>}
              </div>
              <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <div className="min-w-0 space-y-3">
                  <h2 className="break-words font-heading text-2xl font-semibold">{info?.name || t("Unknown")}</h2>
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {localPeer?.endpoint || localMetric?.endpoint || "--"}
                  </p>
                </div>
                <RiArrowLeftRightLine className="size-6 text-muted-foreground rtl:-scale-x-100" aria-hidden />
                <div className="min-w-0 space-y-3">
                  {remotePeers.length ? (
                    remotePeers.slice(0, 3).map((peer) => (
                      <div key={peer.deploymentId} className="border-s-2 border-brand ps-4">
                        <p className="break-words text-sm font-medium">{peer.name || t("Unknown")}</p>
                        <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{peer.endpoint}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t("Add a remote site to initialize site replication for this deployment.")}
                    </p>
                  )}
                  {remotePeers.length > 3 ? (
                    <a href="#peer-sites" className="text-xs text-link hover:underline">
                      {t("Peer Sites")} ({peers.length})
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 border-t pt-4">
                <SummaryStat
                  label={t("Deployment ID")}
                  value={
                    <span className="break-all font-mono text-xs text-muted-foreground">
                      {localDeploymentId || "--"}
                    </span>
                  }
                />
                {info?.enabled && !localDeploymentId ? (
                  <p className="mt-3 text-xs text-muted-foreground" role="note">
                    {localSite.ambiguousName
                      ? t("Multiple peers share the local site name, so the current site cannot be identified.")
                      : t(
                          "The current site could not be identified because the server did not report its deployment ID.",
                        )}
                  </p>
                ) : null}
              </div>
            </section>
            <section className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-base font-semibold">{t("Replication Summary")}</h2>
                <p className="max-w-xl text-sm text-muted-foreground">
                  {t("Overview of replicated configuration and object replication activity.")}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SummaryStat
                  label={t("Status")}
                  value={
                    info?.enabled ? (
                      <Badge>{t("Enabled")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("Not configured")}</Badge>
                    )
                  }
                />
                <SummaryStat label={t("Sites")} value={peers.length} />
                <SummaryStat label={t("Replicated Objects")} value={status ? status.metrics.replicaCount : "--"} />
                <SummaryStat
                  label={t("Replicated Size")}
                  value={status ? niceBytes(String(status.metrics.replicaSize ?? 0)) : "--"}
                />
              </div>
            </section>
          </div>

          <section id="peer-sites" className="scroll-mt-24 space-y-4" aria-labelledby="peer-sites-title">
            <h2 id="peer-sites-title" className="font-heading text-lg font-semibold">
              {t("Peer Sites")}
            </h2>
            <DataTable
              caption={t("Peer Sites")}
              table={table}
              isLoading={loading}
              emptyTitle={t("No Data")}
              emptyDescription={t("Add a remote site to initialize site replication for this deployment.")}
            />
          </section>

          <div className="grid gap-10 border-t pt-8 xl:grid-cols-2">
            <section className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-base font-semibold">{t("Replicated Scope")}</h2>
                <p className="max-w-xl text-sm text-muted-foreground">
                  {statusUnavailable
                    ? t("This server does not provide the detailed site replication status endpoint yet.")
                    : t(
                        "Current backend status for replicated buckets, users, groups, policies, and lifecycle expiry rules.",
                      )}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SummaryStat label={t("Buckets")} value={status?.maxBuckets ?? localSummary?.totalBucketsCount ?? 0} />
                <SummaryStat label={t("Users")} value={status?.maxUsers ?? localSummary?.totalUsersCount ?? 0} />
                <SummaryStat label={t("Groups")} value={status?.maxGroups ?? localSummary?.totalGroupsCount ?? 0} />
                <SummaryStat
                  label={t("Policies")}
                  value={status?.maxPolicies ?? localSummary?.totalIamPoliciesCount ?? 0}
                />
                <SummaryStat
                  label={t("ILM Expiry Rules")}
                  value={status?.maxIlmExpiryRules ?? localSummary?.totalIlmExpiryRulesCount ?? 0}
                />
                <SummaryStat label={t("Last Online")} value={formatDateTime(localMetric?.lastOnline)} />
              </div>
            </section>
            <section className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-base font-semibold">{t("Replication Controls")}</h2>
                <p className="max-w-xl text-sm text-muted-foreground">
                  {t(
                    "Service account and global lifecycle expiry replication settings for the site replication group.",
                  )}
                </p>
                {info?.serviceAccountAccessKey ? <CopyButton value={info.serviceAccountAccessKey} iconOnly /> : null}
              </div>
              <div className="grid gap-4">
                <SummaryStat
                  label={t("Service Account Access Key")}
                  value={
                    info?.serviceAccountAccessKey ? (
                      <span className="font-mono text-xs break-all">{info.serviceAccountAccessKey}</span>
                    ) : (
                      t("Created automatically after the first remote site is added")
                    )
                  }
                />
                <SummaryStat
                  label={t("ILM Expiry")}
                  value={
                    ilmExpiryEnabled ? <Badge>{t("Enabled")}</Badge> : <Badge variant="outline">{t("Disabled")}</Badge>
                  }
                />
                {canManageSites ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="inline-flex items-center gap-2"
                      onClick={() => confirmToggleIlmExpiry(!ilmExpiryEnabled)}
                      disabled={!info?.enabled || pendingIlmToggle}
                    >
                      <RiUploadCloud2Line className="size-4" aria-hidden />
                      <span>{ilmExpiryEnabled ? t("Disable ILM Expiry") : t("Enable ILM Expiry")}</span>
                    </Button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </>
      )}

      <SiteReplicationNewForm
        open={newFormOpen}
        onOpenChange={setNewFormOpen}
        onSuccess={() => void loadData()}
        isConfigured={!!info?.enabled}
      />

      <SiteReplicationEditForm
        open={!!editingPeer}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPeer(null)
          }
        }}
        peer={editingPeer}
        isLocal={!!editingPeer && editingPeer.deploymentId === localDeploymentId}
        onSuccess={(endpoint) => {
          if (editingPeer) handleEditSuccess(editingPeer, endpoint)
        }}
      />
    </Page>
  )
}
