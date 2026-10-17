"use client"

import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  RiDownload2Line,
  RiUpload2Line,
  RiCloseLine,
  RiUserLine,
  RiGroupLine,
  RiShieldCheckLine,
  RiKeyLine,
  RiInformationLine,
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { UploadZone } from "@/components/upload-zone"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { useImportExport } from "@/hooks/use-import-export"
import { useMessage } from "@/lib/feedback/message"

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let size = bytes
  let unitIndex = -1
  do {
    size /= 1024
    unitIndex++
  } while (size >= 1024 && unitIndex < units.length - 1)
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export default function ImportExportPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const { isLoading, exportIamConfig, importIamConfig } = useImportExport()

  const [activeTab, setActiveTab] = useState<"export" | "import">("export")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState("")

  const tabs = useMemo(
    () => [
      { key: "export" as const, label: t("Export") },
      { key: "import" as const, label: t("Import") },
    ],
    [t],
  )

  const exportHighlights = useMemo(
    () => [
      { label: "Users", icon: RiUserLine },
      { label: "User Groups", icon: RiGroupLine },
      {
        label: "IAM Policies",
        icon: RiShieldCheckLine,
      },
      { label: "AK/SK", icon: RiKeyLine },
    ],
    [],
  )

  const MAX_SIZE = 10 * 1024 * 1024

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setUploadError("")
  }

  const validateFile = (file: File | null) => {
    if (!file) return false
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setUploadError(t("Only ZIP files are supported, and file size should not exceed 10MB"))
      return false
    }
    if (file.size > MAX_SIZE) {
      setUploadError(t("File size exceeds limit (10MB)"))
      return false
    }
    setUploadError("")
    return true
  }

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      clearSelectedFile()
      return
    }
    if (validateFile(file)) {
      setSelectedFile(file)
    } else {
      setSelectedFile(null)
    }
  }

  const handleExportIam = async () => {
    try {
      await exportIamConfig()
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  const handleImportIam = async () => {
    if (!selectedFile) return
    try {
      await importIamConfig(selectedFile)
      message.success(t("Import Success"))
      clearSelectedFile()
    } catch {
      // Error already handled in hook
    }
  }

  return (
    <Page>
      <PageHeader>
        <h1 className="text-2xl font-bold">{t("Import/Export")}</h1>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <TabsPrimitive.Root
          orientation="vertical"
          data-slot="tabs"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "export" | "import")}
          className="grid items-start gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]"
        >
          <TabsList className="h-auto w-full flex-col items-stretch justify-start bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="min-h-11 justify-start border-s-2 border-transparent px-4 capitalize data-active:border-brand data-active:bg-selection"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="export" className="mt-0">
            <Card className="configuration-panel">
              <CardHeader className="space-y-1">
                <CardTitle>{t("IAM Configuration Export")}</CardTitle>
                <CardDescription>
                  {t("Export all IAM configurations including users, groups, policies, and access keys in a ZIP file.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {exportHighlights.map((item) => (
                    <div key={item.label} className="flex items-center gap-3 border-b py-3">
                      <item.icon className="size-5 text-muted-foreground" aria-hidden />
                      <span className="text-sm font-medium text-foreground">{t(item.label)}</span>
                    </div>
                  ))}
                </div>

                <Alert>
                  <RiInformationLine className="size-4" aria-hidden />
                  <AlertTitle>{t("Notice")}</AlertTitle>
                  <AlertDescription>
                    {t("The exported file contains sensitive information. Please keep it secure.")}
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-3 text-start sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {t("Download complete IAM configuration as ZIP file")}
                </div>
                <Button
                  variant="default"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={isLoading}
                  onClick={handleExportIam}
                >
                  <RiDownload2Line className="size-4" aria-hidden />
                  <span>{isLoading ? t("Exporting…") : t("Export Now")}</span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="mt-0">
            <Card className="configuration-panel">
              <CardHeader className="space-y-1">
                <CardTitle>{t("IAM Configuration Import")}</CardTitle>
                <CardDescription>{t("Import IAM configurations from a previously exported ZIP file.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <UploadZone accept=".zip" disabled={isLoading} className="border-dashed" onChange={handleFileSelect}>
                    <p className="text-base font-medium">{t("Click or drag ZIP file to this area to upload")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("Only ZIP files are supported, and file size should not exceed 10MB")}
                    </p>
                  </UploadZone>
                  {uploadError && (
                    <p className="text-sm text-destructive" role="alert">
                      {uploadError}
                    </p>
                  )}

                  {selectedFile && (
                    <div className="flex items-start justify-between gap-3 bg-muted/30 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-sm font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        aria-label={t("Remove")}
                        onClick={clearSelectedFile}
                      >
                        <RiCloseLine className="size-4" aria-hidden />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-3 text-start sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 break-all text-sm text-muted-foreground">
                  {selectedFile
                    ? t("Ready to import: {filename}", {
                        filename: selectedFile.name,
                      })
                    : t("Please select a ZIP file to import")}
                </div>
                <Button
                  variant="default"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={isLoading || !selectedFile}
                  onClick={handleImportIam}
                >
                  <RiUpload2Line className="size-4" aria-hidden />
                  <span>{isLoading ? t("Importing…") : t("Import Now")}</span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </TabsPrimitive.Root>
      </div>
    </Page>
  )
}
