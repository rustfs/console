"use client"

import { useParams } from "next/navigation"
import { useTranslation } from "react-i18next"

export default function BucketSettingsPage() {
  const { t } = useTranslation()
  const params = useParams()
  const bucketName = params?.key as string

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        {t("Settings")} - {bucketName || "..."}
      </h1>
      <p className="text-muted-foreground">
        Bucket settings page - to be migrated
      </p>
    </div>
  )
}
