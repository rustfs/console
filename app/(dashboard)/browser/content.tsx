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

interface BrowserContentProps {
  bucketName: string
  keyPath?: string
  preview?: boolean
  previewKey?: string
}

export function BrowserContent({ bucketName, keyPath = "", preview = false, previewKey = "" }: BrowserContentProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = useMessage()
  const { headBucket } = useBucket()

  const isObjectList = keyPath.endsWith("/") || keyPath === ""
  const prefix = keyPath.endsWith("/") ? keyPath : keyPath ? `${keyPath}/` : ""

  const [infoOpen, setInfoOpen] = React.useState(false)
  const [infoKey, setInfoKey] = React.useState<string | null>(null)
  const [autoPreview, setAutoPreview] = React.useState(false)
  const [uploadPickerOpen, setUploadPickerOpen] = React.useState(false)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)

  // Handle initial preview params - set infoOpen and trigger auto-preview
  React.useEffect(() => {
    if (preview && previewKey) {
      setInfoKey(previewKey)
      setInfoOpen(true)
      setAutoPreview(true)
    }
  }, [preview, previewKey])

  React.useEffect(() => {
    if (!bucketName) return
    headBucket(bucketName)
      .then(() => {})
      .catch(() => {
        message.error(t("Bucket not found"))
        const params = new URLSearchParams(searchParams.toString())
        router.push(`/browser?${params.toString()}`)
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

  const updatePreviewParams = (showPreview: boolean, key?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (showPreview && key) {
      params.set("preview", "true")
      params.set("previewKey", key)
    } else {
      params.delete("preview")
      params.delete("previewKey")
    }
    router.replace(`/browser?${params.toString()}`)
  }

  const handleInfoOpenChange = (open: boolean) => {
    setInfoOpen(open)
    if (!open) {
      setAutoPreview(false)
      updatePreviewParams(false)
    }
  }

  const handlePreviewChange = (showPreview: boolean) => {
    if (showPreview && infoKey) {
      updatePreviewParams(true, infoKey)
    } else {
      updatePreviewParams(false)
    }
  }

  const handleRefresh = () => {
    setRefreshTrigger((n) => n + 1)
  }

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
            onRefresh={handleRefresh}
            refreshTrigger={refreshTrigger}
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
        autoPreview={autoPreview}
        onPreviewChange={handlePreviewChange}
      />

      <ObjectUploadPicker
        show={uploadPickerOpen}
        onShowChange={setUploadPickerOpen}
        bucketName={bucketName}
        prefix={prefix}
        onSuccess={handleRefresh}
      />
    </Page>
  )
}
