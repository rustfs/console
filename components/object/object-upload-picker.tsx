"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  RiFileAddLine,
  RiFolderAddLine,
  RiDeleteBinLine,
  RiUploadCloudLine,
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useObject } from "@/hooks/use-object"
import { useMessage } from "@/lib/ui/message"
import { formatBytes } from "@/lib/functions"

interface FileItem {
  relativePath: string
  file: File
}

interface ObjectUploadPickerProps {
  show: boolean
  onShowChange: (show: boolean) => void
  bucketName: string
  prefix: string
  onSuccess?: () => void
}

function collectFilesFromFileList(
  files: FileList,
  basePath = ""
): FileItem[] {
  const items: FileItem[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file) continue
    if (file.webkitRelativePath) {
      items.push({
        relativePath: file.webkitRelativePath,
        file,
      })
    } else {
      items.push({
        relativePath: basePath ? `${basePath}/${file.name}` : file.name,
        file,
      })
    }
  }
  return items
}

export function ObjectUploadPicker({
  show,
  onShowChange,
  bucketName,
  prefix,
  onSuccess,
}: ObjectUploadPickerProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const objectApi = useObject(bucketName)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const folderInputRef = React.useRef<HTMLInputElement>(null)

  const [items, setItems] = React.useState<FileItem[]>([])
  const [uploading, setUploading] = React.useState(false)

  const effectivePrefix = prefix

  const selectFile = () => fileInputRef.current?.click()
  const selectFolder = () => folderInputRef.current?.click()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const newItems = collectFilesFromFileList(files)
    setItems((prev) => [...prev, ...newItems])
    e.target.value = ""
  }

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const newItems = collectFilesFromFileList(files)
    setItems((prev) => [...prev, ...newItems])
    e.target.value = ""
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAllFiles = () => {
    setItems([])
  }

  const handleUpload = async () => {
    if (!items.length) return
    setUploading(true)
    let success = 0
    let failed = 0
    try {
      for (const { relativePath, file } of items) {
        const key = effectivePrefix
          ? `${effectivePrefix.replace(/\/$/, "")}/${relativePath}`
          : relativePath
        try {
          await objectApi.putObject(key, file)
          success++
        } catch {
          failed++
        }
      }
      if (failed === 0) {
        message.success(t("Upload Success"))
        onShowChange(false)
        setItems([])
        onSuccess?.()
      } else {
        message.error(t("Upload Failed") + ` (${failed} files)`)
      }
    } catch (err) {
      message.error((err as Error)?.message ?? t("Upload Failed"))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={onShowChange}>
      <DialogContent
        className="sm:max-w-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Upload File")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={folderInputRef}
            type="file"
            className="hidden"
            {...({ webkitdirectory: "true", directory: "true" } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={handleFolderSelect}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("Target Bucket")}: {bucketName}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("Current Prefix")}: {prefix}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={selectFile}
              >
                <RiFileAddLine className="size-4" />
                {t("Select File")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={selectFolder}
              >
                <RiFolderAddLine className="size-4" />
                {t("Select Folder")}
              </Button>
            </div>
          </div>

          <Alert className="border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
            <AlertDescription>{t("Overwrite Warning")}</AlertDescription>
          </Alert>

          <div className="border rounded-md">
            <div className="flex items-center justify-between gap-3 px-4 py-2">
              <div className="text-sm text-muted-foreground">
                {items.length > 0 && (
                  <p>{t("Total Files")}: {items.length.toLocaleString()}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!items.length || uploading}
                onClick={clearAllFiles}
              >
                <RiDeleteBinLine className="size-4" />
                {t("Clear All")}
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="flex h-[20vh] flex-col items-center justify-center gap-4 p-6 text-center">
                <RiUploadCloudLine className="size-10 text-muted-foreground" />
                <p className="text-base font-medium text-muted-foreground">
                  {t("No Selection")}
                </p>
                <p className="max-w-[320px] text-sm text-muted-foreground">
                  {t("Drag Drop Info")}
                  <br />
                  {t("File Size Limit")}
                </p>
              </div>
            ) : (
              <div className="max-h-[30vh] overflow-auto border-t">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        {t("Name")}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {t("Size")}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        {t("Actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={`${item.relativePath}-${index}`}
                        className="border-b last:border-b-0"
                      >
                        <td className="px-3 py-2 font-medium truncate max-w-md">
                          {item.relativePath}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatBytes(item.file.size)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2"
                            onClick={() => removeItem(index)}
                          >
                            <RiDeleteBinLine className="size-4" />
                            {t("Delete")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="default"
              disabled={!items.length || uploading}
              onClick={handleUpload}
            >
              {uploading ? t("Uploading...") : t("Start Upload")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
