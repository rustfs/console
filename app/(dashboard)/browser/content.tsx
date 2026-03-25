"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { ObjectPathLinks } from "@/components/object/path-links"
import { ObjectList } from "@/components/object/list"
import { ObjectView } from "@/components/object/view"
import { ObjectInfo } from "@/components/object/info"
import { ObjectUploadPicker } from "@/components/object/upload-picker"
import { useBucket } from "@/hooks/use-bucket"
import { useMessage } from "@/lib/feedback/message"
import { buildBucketPath } from "@/lib/bucket-path"
import { useTasks } from "@/contexts/task-context"
import { ObjectPreviewModal } from "@/components/object/preview-modal"
import { useObject } from "@/hooks/use-object"
import { usePermissions } from "@/hooks/use-permissions"

interface BrowserContentProps {
  bucketName: string
  keyPath?: string
  preview?: boolean
  previewKey?: string
}

export function BrowserContent({ bucketName, keyPath = "" }: BrowserContentProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = useMessage()
  const { canCapability } = usePermissions()
  const { headBucket } = useBucket()

  const isObjectList = keyPath.endsWith("/") || keyPath === ""
  const prefix = keyPath.endsWith("/") ? keyPath : keyPath ? `${keyPath}/` : ""

  const [infoOpen, setInfoOpen] = React.useState(false)
  const [infoKey, setInfoKey] = React.useState<string | null>(null)
  const [uploadPickerOpen, setUploadPickerOpen] = React.useState(false)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)
  const [showPreview, setShowPreview] = React.useState(false)
  const [previewObject, setPreviewObject] = React.useState<Record<string, unknown> | null>(null)
  const objectApi = useObject(bucketName)
  const canUploadObjects = canCapability("objects.upload", { bucket: bucketName, prefix })

  React.useEffect(() => {
    if (!bucketName) return
    headBucket(bucketName)
      .then(() => {})
      .catch((error: unknown) => {
        const err = error as { $metadata?: { httpStatusCode?: number }; Code?: string; message?: string }
        const status = err?.$metadata?.httpStatusCode
        const code = (err?.Code ?? (error as Error)?.message ?? "").toLowerCase()
        const isAccessDenied =
          status === 403 ||
          code === "accessdenied" ||
          code === "forbidden" ||
          (typeof code === "string" && (code.includes("access denied") || code.includes("forbidden")))
        message.error(isAccessDenied ? t("Access Denied") : t("Bucket not found"))
        const params = new URLSearchParams(searchParams.toString())
        params.delete("bucket")
        params.delete("prefix")
        params.delete("preview")
        params.delete("previewKey")
        const query = params.toString()
        router.push(query ? `/browser?${query}` : "/browser")
      })
  }, [bucketName, headBucket, message, router, t, searchParams])

  const bucketPath = React.useCallback((path?: string | string[]) => buildBucketPath(bucketName, path), [bucketName])

  const handlePathClick = (path: string) => {
    router.push(bucketPath(path))
  }

  const handleOpenInfo = (_bucket: string, key: string) => {
    setInfoKey(key)
    setInfoOpen(true)
  }

  const handleInfoOpenChange = (open: boolean) => {
    setInfoOpen(open)
  }

  const handleRefresh = () => {
    setRefreshTrigger((n) => n + 1)
  }

  const handleOpenPreview = React.useCallback(
    async ({ key, data }: { key?: string; data?: Record<string, unknown> }) => {
      if (!key) return
      const info = data ?? (await objectApi.getObjectInfo(key))
      setPreviewObject(info as Record<string, unknown>)
      setShowPreview(true)
    },
    [objectApi],
  )

  const tasks = useTasks()
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevCompletedIdsRef = React.useRef(new Set<string>())

  React.useEffect(() => {
    const currentIds = new Set(tasks.map((t) => t.id))
    for (const id of prevCompletedIdsRef.current) {
      if (!currentIds.has(id)) prevCompletedIdsRef.current.delete(id)
    }
    const completedForBucket = tasks.filter(
      (t) => (t.kind === "upload" || t.kind === "delete") && t.bucketName === bucketName && t.status === "completed",
    )
    const newCompletions = completedForBucket.filter((t) => !prevCompletedIdsRef.current.has(t.id))
    if (newCompletions.length > 0) {
      newCompletions.forEach((t) => prevCompletedIdsRef.current.add(t.id))
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        setRefreshTrigger((n) => n + 1)
      }, 1500)
    }
  }, [tasks, bucketName, setRefreshTrigger])

  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-4 min-w-[40vw]">
          <h1
            className="text-2xl font-bold cursor-pointer"
            onClick={() => router.push(bucketPath())}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                router.push(bucketPath())
              }
            }}
          >
            {bucketName}
          </h1>
          <ObjectPathLinks objectKey={keyPath} bucketName={bucketName} onClick={handlePathClick} />
        </div>
      </PageHeader>

      <div className="flex flex-col gap-4">
        {isObjectList ? (
          <ObjectList
            bucket={bucketName}
            path={prefix}
            onOpenInfo={handleOpenInfo}
            onUploadClick={() => setUploadPickerOpen(true)}
            canUpload={canUploadObjects}
            onRefresh={handleRefresh}
            refreshTrigger={refreshTrigger}
            onPreview={handleOpenPreview}
          />
        ) : (
          <ObjectView bucketName={bucketName} objectKey={keyPath} />
        )}
      </div>

      <ObjectInfo
        bucketName={bucketName}
        objectKey={infoKey}
        open={infoOpen}
        onOpenChange={handleInfoOpenChange}
        onRefresh={handleRefresh}
        onPreview={handleOpenPreview}
      />

      <ObjectUploadPicker
        show={uploadPickerOpen}
        onShowChange={setUploadPickerOpen}
        bucketName={bucketName}
        prefix={prefix}
        canUpload={canUploadObjects}
      />

      <ObjectPreviewModal show={showPreview} onShowChange={(show) => setShowPreview(show)} object={previewObject} />
    </Page>
  )
}
