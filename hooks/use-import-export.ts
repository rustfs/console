"use client"

import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useApi } from "@/contexts/api-context"
import { useMessage } from "@/lib/feedback/message"
import { exportFile } from "@/lib/export-file"

export function useImportExport() {
  const api = useApi()
  const message = useMessage()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const exportIamConfig = useCallback(async () => {
    try {
      setIsLoading(true)

      const response = await api.request(
        "/export-iam",
        {
          method: "GET",
          headers: { Accept: "application/zip" },
        },
        false,
      )

      if (!response || !(response instanceof Response)) {
        throw new Error("No response")
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "")
      const fileName = `iam-config-export-${timestamp}.zip`

      const blob = await response.blob()
      const exportResponse = {
        data: blob,
        headers: {
          "content-type": "application/zip",
          filename: encodeURIComponent(fileName),
        },
      }

      exportFile(exportResponse, fileName)
      message.success(t("IAM configuration exported successfully"))
    } catch (error) {
      console.error("IAM export error:", error)
      message.error((error as Error).message || t("Failed to export IAM configuration"))
    } finally {
      setIsLoading(false)
    }
  }, [api, message, t])

  const importIamConfig = useCallback(
    async (file: File) => {
      try {
        setIsLoading(true)

        await api.put("/import-iam", file, {
          headers: { "Content-Type": "application/zip" },
        })

        message.success(t("IAM configuration imported successfully"))
      } catch (error) {
        console.error("IAM import error:", error)
        message.error((error as Error).message || t("Failed to import IAM configuration"))
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [api, message, t],
  )

  return { isLoading, exportIamConfig, importIamConfig }
}
