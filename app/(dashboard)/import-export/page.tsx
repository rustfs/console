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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useImportExport } from "@/hooks/use-import-export"
import { useMessage } from "@/lib/ui/message"

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
    [t]
  )

  const exportHighlights = useMemo(
    () => [
      { label: "Users", icon: RiUserLine, iconClass: "text-blue-500" },
      { label: "User Groups", icon: RiGroupLine, iconClass: "text-green-500" },
      {
        label: "IAM Policies",
        icon: RiShieldCheckLine,
        iconClass: "text-purple-500",
      },
      { label: "AK/SK", icon: RiKeyLine, iconClass: "text-orange-500" },
    ],
    []
  )

  const MAX_SIZE = 10 * 1024 * 1024

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setUploadError("")
  }

  const validateFile = (file: File | null) => {
    if (!file) return false
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setUploadError(
        t("Only ZIP files are supported, and file size should not exceed 10MB")
      )
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
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "export" | "import")}
          className="flex flex-col gap-6"
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="capitalize"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="export" className="mt-0">
            <Card className="shadow-none">
              <CardHeader className="space-y-1">
                <CardTitle>{t("IAM Configuration Export")}</CardTitle>
                <CardDescription>
                  {t(
                    "Export all IAM configurations including users, groups, policies, and access keys in a ZIP file."
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {exportHighlights.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-md border bg-muted/40 p-3"
                    >
                      <item.icon
                        className={`size-5 ${item.iconClass}`}
                        aria-hidden
                      />
                      <span className="text-sm font-medium text-foreground">
                        {t(item.label)}
                      </span>
                    </div>
                  ))}
                </div>

                <Alert>
                  <RiInformationLine className="size-4" aria-hidden />
                  <AlertTitle>{t("Notice")}</AlertTitle>
                  <AlertDescription>
                    {t(
                      "The exported file contains sensitive information. Please keep it secure."
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {t("Download complete IAM configuration as ZIP file")}
                </div>
                <Button
                  variant="default"
                  size="lg"
                  disabled={isLoading}
                  onClick={handleExportIam}
                >
                  <RiDownload2Line className="size-4" aria-hidden />
                  <span>
                    {isLoading ? t("Exporting...") : t("Export Now")}
                  </span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="mt-0">
            <Card className="shadow-none">
              <CardHeader className="space-y-1">
                <CardTitle>{t("IAM Configuration Import")}</CardTitle>
                <CardDescription>
                  {t(
                    "Import IAM configurations from a previously exported ZIP file."
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <UploadZone
                    accept=".zip"
                    disabled={isLoading}
                    className="border-dashed"
                    onChange={handleFileSelect}
                  >
                    <p className="text-base font-medium">
                      {t("Click or drag ZIP file to this area to upload")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(
                        "Only ZIP files are supported, and file size should not exceed 10MB"
                      )}
                    </p>
                  </UploadZone>
                  {uploadError && (
                    <p className="text-sm text-destructive">{uploadError}</p>
                  )}

                  {selectedFile && (
                    <Card className="border-dashed bg-muted/30 shadow-none">
                      <CardContent className="flex items-start justify-between gap-3 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatSize(selectedFile.size)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={clearSelectedFile}
                        >
                          <RiCloseLine className="size-4" aria-hidden />
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedFile
                    ? t("Ready to import: {filename}", {
                        filename: selectedFile.name,
                      })
                    : t("Please select a ZIP file to import")}
                </div>
                <Button
                  variant="default"
                  size="lg"
                  disabled={isLoading || !selectedFile}
                  onClick={handleImportIam}
                >
                  <RiUpload2Line className="size-4" aria-hidden />
                  <span>
                    {isLoading ? t("Importing...") : t("Import Now")}
                  </span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Page>
  )
}
