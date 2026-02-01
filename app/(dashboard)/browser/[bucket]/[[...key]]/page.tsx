"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { ObjectPathLinks } from "@/components/object/object-path-links"
import { ObjectList } from "@/components/object/object-list"
import { ObjectView } from "@/components/object/object-view"
import { ObjectInfo } from "@/components/object/object-info"
import { ObjectUploadPicker } from "@/components/object/object-upload-picker"
import { useBucket } from "@/hooks/use-bucket"
import { useMessage } from "@/lib/ui/message"
import { buildBucketPath } from "@/lib/bucket-path"

interface PageProps {
  params: Promise<{ bucket: string; key?: string[] }>
}

export default function BucketBrowserPage({ params }: PageProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const message = useMessage()
  const { headBucket } = useBucket()

  const [resolved, setResolved] = React.useState<{ bucket: string; key: string[] } | null>(null)
  const [infoOpen, setInfoOpen] = React.useState(false)
  const [infoKey, setInfoKey] = React.useState<string | null>(null)
  const [uploadPickerOpen, setUploadPickerOpen] = React.useState(false)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)

  React.useEffect(() => {
    let mounted = true
    params.then((p) => {
      if (mounted) {
        setResolved({ bucket: p.bucket, key: p.key ?? [] })
      }
    })
    return () => {
      mounted = false
    }
  }, [params])

  const bucketName = resolved?.bucket ?? ""
  const keySegments = resolved?.key ?? []
  const keyPath = decodeURIComponent(keySegments.join("/"))
  // 目录路径以 / 结尾，keyPath 可能为 "folder1/"（来自 encodeURIComponent 编码的 URL）
  const isObjectList = keyPath.endsWith("/") || keyPath === ""
  const prefix = keyPath.endsWith("/") ? keyPath : keyPath ? keyPath + "/" : ""

  React.useEffect(() => {
    if (!bucketName) return
    headBucket(bucketName)
      .then(() => {})
      .catch(() => {
        message.error(t("Bucket not found"))
        router.push("/browser")
      })
  }, [bucketName, headBucket, message, router, t])

  const bucketPath = React.useCallback(
    (path?: string | string[]) => buildBucketPath(bucketName, path),
    [bucketName]
  )

  const handlePathClick = (path: string) => {
    router.push(bucketPath(path))
  }

  const handleOpenInfo = (bucket: string, key: string) => {
    setInfoKey(key)
    setInfoOpen(true)
  }

  const handleRefresh = () => {
    setRefreshTrigger((n) => n + 1)
  }

  if (!resolved) {
    return null
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
          <ObjectPathLinks
            objectKey={keyPath}
            bucketName={bucketName}
            onClick={handlePathClick}
          />
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
          <ObjectView
            bucketName={bucketName}
            objectKey={keyPath}
          />
        )}
      </div>

      <ObjectInfo
        bucketName={bucketName}
        objectKey={infoKey}
        open={infoOpen}
        onOpenChange={setInfoOpen}
        onRefresh={handleRefresh}
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
