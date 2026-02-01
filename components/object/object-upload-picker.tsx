"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { useAddUploadFiles, useTaskPanelOpen } from "@/contexts/task-context"
import { formatBytes } from "@/lib/functions"
import { useMessage } from "@/lib/ui/message"
import {
  RiDeleteBinLine,
  RiFileAddLine,
  RiFolderAddLine,
  RiUploadCloudLine,
} from "@remixicon/react"
import { useVirtualizer } from "@tanstack/react-virtual"
import * as React from "react"
import { useTranslation } from "react-i18next"

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

const ROW_HEIGHT = 40
const MAX_FILES_LIMIT = 10_000
const MEMORY_WARNING_THRESHOLD = 5_000

function getFilesFromEntry(
  entry: FileSystemEntry,
  path = ""
): Promise<{ file: File; relativePath: string }[]> {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      ; (entry as FileSystemFileEntry).file((file) => {
        resolve([{ file, relativePath: path + file.name }])
      })
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader()
      const entries: FileSystemEntry[] = []
      function readBatch() {
        dirReader.readEntries(
          async (results) => {
            if (!results.length) {
              const filesArrays = await Promise.all(
                entries.map((e) => getFilesFromEntry(e, path + entry.name + "/"))
              )
              resolve(filesArrays.flat())
            } else {
              entries.push(...results)
              readBatch()
            }
          },
          (err) => reject(err)
        )
      }
      readBatch()
    } else {
      resolve([])
    }
  })
}

type DirHandleLike = {
  values: () => AsyncIterable<FileSystemHandle>
}

async function getFilesFromDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle & DirHandleLike,
  basePath = "",
  onProgress?: (count: number) => void
): Promise<{ file: File; relativePath: string }[]> {
  const results: { file: File; relativePath: string }[] = []
  let count = 0

  async function walk(
    handle: FileSystemDirectoryHandle & DirHandleLike,
    path: string
  ) {
    for await (const entry of handle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name
      if (entry.kind === "file") {
        const file = await (entry as FileSystemFileHandle).getFile()
        results.push({ file, relativePath: entryPath })
        count++
        if (count % 100 === 0 && onProgress) onProgress(count)
      } else if (entry.kind === "directory") {
        await walk(entry as FileSystemDirectoryHandle & DirHandleLike, entryPath)
      }
    }
  }

  await walk(dirHandle, basePath)
  if (onProgress) onProgress(count)
  return results
}

function FileListVirtualized({
  items,
  removeItem,
  t,
  formatBytes,
}: {
  items: FileItem[]
  removeItem: (index: number) => void
  t: (key: string) => string
  formatBytes: (bytes: number) => string
}) {
  const parentRef = React.useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })
  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t text-sm">
      <div className="flex shrink-0 border-b bg-muted text-xs uppercase text-muted-foreground">
        <div className="min-w-0 flex-1 px-3 py-2 font-medium">{t("Name")}</div>
        <div className="w-28 shrink-0 px-3 py-2 font-medium">{t("Size")}</div>
        <div className="w-24 shrink-0 px-3 py-2 text-right font-medium">
          {t("Actions")}
        </div>
      </div>
      <div
        ref={parentRef}
        className="min-h-64 min-w-0 flex-1 overflow-auto"
        style={{ contain: "strict" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = items[virtualRow.index]
            return (
              <div
                key={`${item.relativePath}-${virtualRow.index}`}
                className="absolute left-0 top-0 flex w-full border-b last:border-b-0"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className="min-w-0 flex-1 truncate px-3 py-2 font-medium"
                  title={item.relativePath}
                >
                  {item.relativePath}
                </div>
                <div className="w-28 shrink-0 px-3 py-2 text-muted-foreground">
                  {formatBytes(item.file.size)}
                </div>
                <div className="w-24 shrink-0 px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2"
                    onClick={() => removeItem(virtualRow.index)}
                  >
                    <RiDeleteBinLine className="size-4" />
                    {t("Delete")}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
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
  const addUploadFiles = useAddUploadFiles()
  const { setTaskPanelOpen } = useTaskPanelOpen()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const folderInputRef = React.useRef<HTMLInputElement>(null)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const [items, setItems] = React.useState<FileItem[]>([])
  const [isAdding, setIsAdding] = React.useState(false)
  const [addProgress, setAddProgress] = React.useState(0)
  const [isFolderLoading, setIsFolderLoading] = React.useState(false)
  const [folderLoadingProgress, setFolderLoadingProgress] = React.useState(0)
  const [isMemoryWarning, setIsMemoryWarning] = React.useState(false)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const memoryWarningShownRef = React.useRef(false)

  const effectivePrefix = prefix.replace(/\/$/, "") || ""

  const ensureCapacity = React.useCallback(
    (incoming: number): boolean => {
      const nextTotal = items.length + incoming
      if (nextTotal > MAX_FILES_LIMIT) {
        message.error(
          String(t("File Count Limit Exceeded", { current: nextTotal, max: MAX_FILES_LIMIT }))
        )
        return false
      }
      if (nextTotal > MEMORY_WARNING_THRESHOLD) {
        setIsMemoryWarning(true)
        if (!memoryWarningShownRef.current) {
          memoryWarningShownRef.current = true
          message.warning(
            String(t("Memory Warning", { count: nextTotal, threshold: MEMORY_WARNING_THRESHOLD }))
          )
        }
      }
      return true
    },
    [items.length, message, t]
  )

  const selectFile = () => fileInputRef.current?.click()

  const selectFolder = React.useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      "showDirectoryPicker" in window &&
      typeof (window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> })
        .showDirectoryPicker === "function"
    ) {
      try {
        const dirHandle = await (
          window as Window & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }
        ).showDirectoryPicker()
        setIsFolderLoading(true)
        setFolderLoadingProgress(0)
        let lastReported = 0
        const newItems = await getFilesFromDirectoryHandle(
          dirHandle as FileSystemDirectoryHandle & DirHandleLike,
          "",
          (count) => {
            if (count - lastReported >= 200 || count === 0) {
              lastReported = count
              setFolderLoadingProgress(
                count > 0 ? Math.min(99, Math.round((count / 25000) * 100)) : 0
              )
            }
          }
        )
        if (!ensureCapacity(newItems.length)) return
        setItems((prev) => [...prev, ...newItems])
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("Failed to read directory:", err)
          message.error(t("Folder Processing Error"))
        }
      } finally {
        setIsFolderLoading(false)
        setFolderLoadingProgress(100)
      }
    } else {
      folderInputRef.current?.click()
    }
  }, [ensureCapacity, message, t])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const newItems = collectFilesFromFileList(files)
    if (!ensureCapacity(newItems.length)) {
      e.target.value = ""
      return
    }
    setItems((prev) => [...prev, ...newItems])
    e.target.value = ""
  }

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const fileArray = Array.from(files)
    if (!ensureCapacity(fileArray.length)) {
      e.target.value = ""
      return
    }
    setIsFolderLoading(true)
    setFolderLoadingProgress(0)
    const batchSize = 200
    let allNewItems: FileItem[] = []
    for (let i = 0; i < fileArray.length; i += batchSize) {
      const batch = fileArray.slice(i, i + batchSize)
      const newItems: FileItem[] = batch.map((file) => ({
        relativePath: file.webkitRelativePath || file.name,
        file,
      }))
      allNewItems = allNewItems.concat(newItems)
      setFolderLoadingProgress(Math.round(((i + batch.length) / fileArray.length) * 100))
      await new Promise((r) => setTimeout(r, 1))
    }
    setItems((prev) => [...prev, ...allNewItems])
    setIsFolderLoading(false)
    setFolderLoadingProgress(100)
    e.target.value = ""
  }

  const handleDrop = React.useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (isAdding || isFolderLoading) return

      const dtItems = e.dataTransfer?.items
      if (
        dtItems?.length &&
        dtItems[0] &&
        typeof (dtItems[0] as DataTransferItem).webkitGetAsEntry === "function"
      ) {
        let allFiles: { file: File; relativePath: string }[] = []
        setIsFolderLoading(true)
        try {
          for (let i = 0; i < dtItems.length; i++) {
            const item = dtItems[i]
            if (!item) continue
            const entry =
              typeof (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null })
                .webkitGetAsEntry === "function"
                ? (item as DataTransferItem & { webkitGetAsEntry: () => FileSystemEntry | null }).webkitGetAsEntry()
                : null
            if (entry) {
              const files = await getFilesFromEntry(entry)
              allFiles = allFiles.concat(files)
            }
          }
          if (!ensureCapacity(allFiles.length)) return
          const newItems: FileItem[] = allFiles.map(({ file, relativePath }) => ({
            relativePath,
            file,
          }))
          setItems((prev) => [...prev, ...newItems])
        } catch (err) {
          console.error("Failed to read dropped files:", err)
          message.error(t("Folder Processing Error"))
        } finally {
          setIsFolderLoading(false)
        }
        return
      }

      const droppedFiles = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : []
      if (!droppedFiles.length) return
      if (!ensureCapacity(droppedFiles.length)) return
      const newItems = droppedFiles.map((file) => ({
        relativePath: file.name,
        file,
      }))
      setItems((prev) => [...prev, ...newItems])
    },
    [ensureCapacity, isAdding, isFolderLoading, message, t]
  )

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    if (!isFolderLoading && !isAdding) setIsDragOver(true)
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!isFolderLoading && !isAdding) setIsDragOver(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAllFiles = () => {
    setItems([])
    setIsMemoryWarning(false)
    memoryWarningShownRef.current = false
  }

  const handleUpload = async () => {
    if (!items.length) return
    setIsAdding(true)
    setAddProgress(0)
    try {
      const tasks = items.map(({ relativePath, file }) => ({
        file,
        key: effectivePrefix ? `${effectivePrefix}/${relativePath}` : relativePath,
      }))
      const batchSize = 50
      let processed = 0
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize)
        addUploadFiles(
          batch.map((b) => ({ file: b.file, key: b.key })),
          bucketName
        )
        processed += batch.length
        setAddProgress(Math.round((processed / tasks.length) * 100))
        await new Promise((r) => setTimeout(r, 0))
      }
      setTimeout(() => {
        if (mountedRef.current) {
          setItems([])
        }
        onSuccess?.()
        setTaskPanelOpen(true)
        onShowChange(false)
      }, 0)
    } catch (err) {
      console.error("Failed to enqueue upload tasks:", err)
      message.error(t("Add Failed"))
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={onShowChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Upload File")}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
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
            {...({
              webkitdirectory: "",
              directory: "",
            } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={handleFolderSelect}
          />

          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium text-muted-foreground">
                {t("Target Bucket")}: {bucketName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {t("Current Prefix")}: {prefix}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isAdding || isFolderLoading}
                onClick={selectFile}
              >
                <RiFileAddLine className="size-4" />
                {t("Select File")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isAdding || isFolderLoading}
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

          {isMemoryWarning && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <AlertDescription>
                {t("Large File Count Warning", {
                  count: items.length,
                  max: MAX_FILES_LIMIT,
                })}
              </AlertDescription>
            </Alert>
          )}

          <div
            className={`min-h-0 min-w-0 flex flex-col overflow-hidden rounded-md border transition-colors ${isDragOver ? "border-primary bg-primary/5" : ""
              }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2">
              <div className="text-sm text-muted-foreground">
                {items.length > 0 && (
                  <p>
                    {t("Total Files")}: {items.length.toLocaleString()} /{" "}
                    {MAX_FILES_LIMIT.toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!items.length || isAdding || isFolderLoading}
                onClick={clearAllFiles}
              >
                <RiDeleteBinLine className="size-4" />
                {t("Clear All")}
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
                <RiUploadCloudLine className="size-12 text-muted-foreground" />
                <p className="text-base font-medium text-muted-foreground">
                  {t("No Selection")}
                </p>
                <p className="max-w-[320px] text-xs text-muted-foreground">
                  {t("Chrome and Firefox support drag and drop to this area and selecting multiple files or folders.")}
                  <br />
                  {t("Single file supports up to 512GB, use CLI for larger files.")}
                  <br />
                  {t("Up to {max} files per upload", { max: MAX_FILES_LIMIT.toLocaleString() })}
                </p>
              </div>
            ) : (
              <FileListVirtualized
                items={items}
                removeItem={removeItem}
                t={t}
                formatBytes={formatBytes}
              />
            )}

            {isFolderLoading && (
              <div className="space-y-2 rounded-md border border-dashed p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("Reading Folder Files")}</span>
                  <span>{folderLoadingProgress}%</span>
                </div>
                <Progress value={folderLoadingProgress} className="h-2" />
              </div>
            )}

            {isAdding && (
              <div className="space-y-2 rounded-md border border-dashed p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("Adding to Upload Queue")}</span>
                  <span>{addProgress}%</span>
                </div>
                <Progress value={addProgress} className="h-2" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="default"
              disabled={!items.length || isAdding || isFolderLoading}
              onClick={handleUpload}
            >
              {isAdding ? t("Adding to Upload Queue") : t("Start Upload")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
