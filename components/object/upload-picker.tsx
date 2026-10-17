"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useAddUploadFiles, useTaskPanelOpen } from "@/contexts/task-context"
import { formatBytes, formatInteger } from "@/lib/functions"
import { useMessage } from "@/lib/feedback/message"
import { buildUploadObjectKey, normalizeUploadPrefix } from "@/lib/object-upload"
import {
  RiDeleteBinLine,
  RiFileAddLine,
  RiFileLine,
  RiFolderAddLine,
  RiInformationLine,
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
  canUpload?: boolean
  onSuccess?: () => void
}

const ROW_HEIGHT = 56
const MAX_FILES_LIMIT = 10_000
const MEMORY_WARNING_THRESHOLD = 5_000

function getFilesFromEntry(entry: FileSystemEntry, path = ""): Promise<{ file: File; relativePath: string }[]> {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      ;(entry as FileSystemFileEntry).file((file) => {
        resolve([{ file, relativePath: path + file.name }])
      })
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader()
      const entries: FileSystemEntry[] = []
      function readBatch() {
        dirReader.readEntries(
          async (results) => {
            if (!results.length) {
              const filesArrays = await Promise.all(entries.map((e) => getFilesFromEntry(e, path + entry.name + "/")))
              resolve(filesArrays.flat())
            } else {
              entries.push(...results)
              readBatch()
            }
          },
          (err) => reject(err),
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
  onProgress?: (count: number) => void,
): Promise<{ file: File; relativePath: string }[]> {
  const results: { file: File; relativePath: string }[] = []
  let count = 0

  async function walk(handle: FileSystemDirectoryHandle & DirHandleLike, path: string) {
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
  // eslint-disable-next-line react-hooks/incompatible-library -- tanstack virtualizer hooks are intentionally used here
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })
  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className="flex min-h-min flex-1 flex-col text-sm">
      <div className="flex shrink-0 border-b bg-muted text-xs uppercase text-muted-foreground">
        <div className="min-w-0 flex-1 px-3 py-2 font-medium">{t("Name")}</div>
        <div className="w-24 shrink-0 px-3 py-2 text-end font-medium">{t("Size")}</div>
        <div className="w-20 shrink-0 px-3 py-2 text-end font-medium">{t("Actions")}</div>
      </div>
      <div
        ref={parentRef}
        className="min-h-14 min-w-0 overflow-auto"
        style={{ contain: "strict", height: Math.min(items.length, 6) * ROW_HEIGHT }}
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
                className="absolute start-0 top-0 flex w-full border-b last:border-b-0"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 px-3" title={item.relativePath}>
                  <RiFileLine className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span dir="ltr" className="truncate">
                    {item.relativePath}
                  </span>
                </div>
                <div
                  dir="ltr"
                  className="flex w-24 shrink-0 items-center justify-end px-3 font-mono text-xs text-muted-foreground"
                >
                  {formatBytes(item.file.size)}
                </div>
                <div className="flex w-20 shrink-0 items-center justify-end px-3">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t("Delete")} ${item.relativePath}`}
                    onClick={() => removeItem(virtualRow.index)}
                  >
                    <RiDeleteBinLine className="size-4" aria-hidden />
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

function collectFilesFromFileList(files: FileList, basePath = ""): FileItem[] {
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
  canUpload = false,
  onSuccess,
}: ObjectUploadPickerProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const addUploadFiles = useAddUploadFiles()
  const { setTaskPanelOpen } = useTaskPanelOpen()
  const prefixInputId = React.useId()
  const selectFileButtonRef = React.useRef<HTMLButtonElement>(null)
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
  const [editablePrefix, setEditablePrefix] = React.useState(prefix)

  React.useEffect(() => {
    if (show) {
      setEditablePrefix(prefix)
    }
  }, [show, prefix])

  React.useEffect(() => {
    if (show && !canUpload) {
      onShowChange(false)
    }
  }, [canUpload, onShowChange, show])

  const effectivePrefix = normalizeUploadPrefix(editablePrefix)

  const ensureCapacity = React.useCallback(
    (incoming: number): boolean => {
      const nextTotal = items.length + incoming
      if (nextTotal > MAX_FILES_LIMIT) {
        message.error(String(t("File Count Limit Exceeded", { current: nextTotal, max: MAX_FILES_LIMIT })))
        return false
      }
      if (nextTotal > MEMORY_WARNING_THRESHOLD) {
        setIsMemoryWarning(true)
        if (!memoryWarningShownRef.current) {
          memoryWarningShownRef.current = true
          message.warning(String(t("Memory Warning", { count: nextTotal, threshold: MEMORY_WARNING_THRESHOLD })))
        }
      }
      return true
    },
    [items.length, message, t],
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
          (dirHandle as FileSystemDirectoryHandle).name ?? "",
          (count) => {
            if (count - lastReported >= 200 || count === 0) {
              lastReported = count
              setFolderLoadingProgress(count > 0 ? Math.min(99, Math.round((count / 25000) * 100)) : 0)
            }
          },
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
      const droppedFileItems = e.dataTransfer?.files?.length ? collectFilesFromFileList(e.dataTransfer.files) : []
      let entryItems: FileItem[] = []
      const supportsEntryApi = Boolean(
        dtItems?.length &&
        Array.from(dtItems).some(
          (item) =>
            typeof (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry ===
            "function",
        ),
      )
      if (supportsEntryApi && dtItems) {
        setIsFolderLoading(true)
        try {
          const entries: FileSystemEntry[] = []
          for (let i = 0; i < dtItems.length; i++) {
            const item = dtItems[i]
            if (!item || item.kind !== "file") continue
            const entry =
              typeof (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null })
                .webkitGetAsEntry === "function"
                ? (item as DataTransferItem & { webkitGetAsEntry: () => FileSystemEntry | null }).webkitGetAsEntry()
                : null
            if (entry) entries.push(entry)
          }
          const filesArrays = await Promise.all(entries.map((entry) => getFilesFromEntry(entry)))
          const allFiles = filesArrays.flat()
          entryItems = allFiles.map(({ file, relativePath }) => ({
            relativePath,
            file,
          }))
        } catch (err) {
          console.error("Failed to read dropped files:", err)
          message.error(t("Folder Processing Error"))
        } finally {
          setIsFolderLoading(false)
        }
      }

      // Some browsers only expose part of dragged folders via entry API.
      // Fall back to FileList when it contains more files.
      const newItems = droppedFileItems.length > entryItems.length ? droppedFileItems : entryItems
      if (!newItems.length) return
      if (!ensureCapacity(newItems.length)) return
      setItems((prev) => [...prev, ...newItems])
    },
    [ensureCapacity, isAdding, isFolderLoading, message, t],
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
    selectFileButtonRef.current?.focus()
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAllFiles = () => {
    selectFileButtonRef.current?.focus()
    setItems([])
    setIsMemoryWarning(false)
    memoryWarningShownRef.current = false
  }

  const handleUpload = async () => {
    if (!canUpload || !items.length) return
    setIsAdding(true)
    setAddProgress(0)
    try {
      const tasks = items.map(({ relativePath, file }) => ({
        file,
        key: buildUploadObjectKey(effectivePrefix, relativePath),
      }))
      const batchSize = 50
      let processed = 0
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize)
        addUploadFiles(
          batch.map((b) => ({ file: b.file, key: b.key })),
          bucketName,
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

  const selectionActions = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        ref={selectFileButtonRef}
        variant={items.length ? "outline" : "default"}
        disabled={!canUpload || isAdding || isFolderLoading}
        onClick={selectFile}
      >
        <RiFileAddLine className="size-4" aria-hidden />
        {t("Select File")}
      </Button>
      <Button variant="outline" disabled={!canUpload || isAdding || isFolderLoading} onClick={selectFolder}>
        <RiFolderAddLine className="size-4" aria-hidden />
        {t("Select Folder")}
      </Button>
    </div>
  )

  return (
    <Dialog
      open={show}
      onOpenChange={(nextOpen) => {
        if (!isAdding) onShowChange(nextOpen)
      }}
      disablePointerDismissal
    >
      <DialogContent
        className="max-h-[90dvh] sm:max-w-2xl"
        initialFocus={selectFileButtonRef}
        aria-busy={isAdding || isFolderLoading}
      >
        <DialogHeader>
          <DialogTitle>{t("Upload File")}</DialogTitle>
          <DialogDescription dir="ltr" className="font-mono text-xs break-all">
            s3://{bucketName}/
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex min-h-0 flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            name="upload-files"
            multiple
            className="hidden"
            aria-label={t("Select File")}
            onChange={handleFileSelect}
          />
          <input
            ref={folderInputRef}
            type="file"
            name="upload-folder"
            className="hidden"
            aria-label={t("Select Folder")}
            {...({
              webkitdirectory: "",
              directory: "",
            } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={handleFolderSelect}
          />

          <div className="min-w-0 shrink-0 space-y-2">
            <label htmlFor={prefixInputId} className="text-sm font-medium">
              {t("Current Prefix")}
            </label>
            <Input
              id={prefixInputId}
              dir="ltr"
              name="upload-prefix"
              value={editablePrefix}
              onChange={(e) => setEditablePrefix(e.target.value)}
              aria-label={t("Current Prefix")}
              className="font-mono text-sm"
              placeholder={t("Enter prefix…")}
              autoComplete="off"
              disabled={!canUpload || isAdding || isFolderLoading}
              spellCheck={false}
            />
          </div>

          {isMemoryWarning && (
            <Alert variant="destructive">
              <AlertDescription>
                {t("Large File Count Warning", {
                  count: items.length,
                  max: MAX_FILES_LIMIT,
                })}
              </AlertDescription>
            </Alert>
          )}

          <div
            className={`min-w-0 border transition-colors ${items.length ? "flex min-h-min flex-1 flex-col overflow-hidden" : "shrink-0 border-dashed bg-muted/10"} ${
              isDragOver ? "border-primary bg-primary/5" : ""
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div
              className={
                items.length
                  ? "flex shrink-0 flex-wrap items-center gap-3 border-b p-3"
                  : "flex flex-col items-center gap-4 px-5 py-7 text-center"
              }
            >
              {items.length > 0 ? (
                <p className="me-auto text-xs text-muted-foreground">
                  {t("Total Files")}: {formatInteger(items.length)} / {formatInteger(MAX_FILES_LIMIT)}
                </p>
              ) : (
                <RiUploadCloudLine className="size-8 text-primary" aria-hidden />
              )}
              {selectionActions}
              {items.length > 0 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("Clear All")}
                  title={t("Clear All")}
                  disabled={!canUpload || isAdding || isFolderLoading}
                  onClick={clearAllFiles}
                >
                  <RiDeleteBinLine className="size-4" aria-hidden />
                </Button>
              ) : (
                <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                  {t("Chrome and Firefox support drag and drop to this area and selecting multiple files or folders.")}
                </p>
              )}
            </div>
            {items.length > 0 && (
              <FileListVirtualized items={items} removeItem={removeItem} t={t} formatBytes={formatBytes} />
            )}

            {isFolderLoading && (
              <div className="space-y-2 border-t bg-muted/30 p-3" role="status" aria-live="polite">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("Reading Folder Files")}</span>
                  <span>{folderLoadingProgress}%</span>
                </div>
                <Progress value={folderLoadingProgress} className="h-2" aria-label={t("Reading Folder Files")} />
              </div>
            )}

            {isAdding && (
              <div className="space-y-2 border-t bg-muted/30 p-3" role="status" aria-live="polite">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("Adding to Upload Queue")}</span>
                  <span>{addProgress}%</span>
                </div>
                <Progress value={addProgress} className="h-2" aria-label={t("Adding to Upload Queue")} />
              </div>
            )}
          </div>
          {items.length === 0 && (
            <div className="shrink-0 space-y-1 text-xs leading-relaxed text-muted-foreground">
              <p>{t("Single file supports up to 512GB, use CLI for larger files.")}</p>
              <p>{t("Up to {max} files per upload", { max: formatInteger(MAX_FILES_LIMIT) })}</p>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex min-w-0 items-start gap-2 text-xs leading-relaxed text-muted-foreground sm:max-w-xs">
            <RiInformationLine className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("Overwrite Warning")}
          </p>
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <Button
              className="flex-1 sm:flex-none"
              variant="outline"
              disabled={isAdding}
              onClick={() => onShowChange(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              variant="default"
              disabled={!canUpload || !items.length || isAdding || isFolderLoading}
              onClick={handleUpload}
            >
              {isAdding ? t("Adding to Upload Queue") : t("Start Upload")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
