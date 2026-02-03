"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiDownloadLine, RiEyeLine, RiPriceTag3Line, RiFileList2Line, RiLockLine, RiCloseLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Item, ItemContent, ItemHeader, ItemTitle } from "@/components/ui/item"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CopyInput } from "@/components/copy-input"
import { useObject } from "@/hooks/use-object"
import { useMessage } from "@/lib/feedback/message"
import { useDialog } from "@/lib/feedback/dialog"
import { exportFile } from "@/lib/export-file"
import { getContentType } from "@/lib/mime-types"
import { ObjectVersions } from "@/components/object/versions"
import { ObjectPreviewModal } from "@/components/object/preview-modal"
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { useS3 } from "@/contexts/s3-context"
import { useAuth } from "@/contexts/auth-context"
import { configManager } from "@/lib/config"

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60

interface ObjectInfoProps {
  bucketName: string
  objectKey: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh?: () => void
}

export function ObjectInfo({ bucketName, objectKey, open, onOpenChange, onRefresh: _onRefresh }: ObjectInfoProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const objectApi = useObject(bucketName)
  const client = useS3()
  const { permanentCredentials } = useAuth()

  const [object, setObject] = React.useState<Record<string, unknown> | null>(null)
  const [tags, setTags] = React.useState<Array<{ Key: string; Value: string }>>([])
  const [lockStatus, setLockStatus] = React.useState(false)
  const [retention, setRetention] = React.useState("")
  const [retainUntilDate, setRetainUntilDate] = React.useState("")
  const [retentionMode, setRetentionMode] = React.useState<"COMPLIANCE" | "GOVERNANCE">("GOVERNANCE")
  const [signedUrl, setSignedUrl] = React.useState("")
  const [showTagView, setShowTagView] = React.useState(false)
  const [showRetentionView, setShowRetentionView] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(false)
  const [showVersions, setShowVersions] = React.useState(false)
  const [previewObject, setPreviewObject] = React.useState<Record<string, unknown> | null>(null)
  const [tagFormValue, setTagFormValue] = React.useState({
    Key: "",
    Value: "",
  })
  const [expirationDays, setExpirationDays] = React.useState(0)
  const [expirationHours, setExpirationHours] = React.useState(0)
  const [expirationMinutes, setExpirationMinutes] = React.useState(0)
  const [expirationError, setExpirationError] = React.useState("")
  const [totalExpirationSeconds, setTotalExpirationSeconds] = React.useState(0)
  const [isExpirationValid, setIsExpirationValid] = React.useState(false)

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return ""
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    const parts: string[] = []
    if (days > 0) parts.push(`${days} ${t("Days")}`)
    if (hours > 0) parts.push(`${hours} ${t("Hours")}`)
    if (minutes > 0) parts.push(`${minutes} ${t("Minutes")}`)
    return parts.join(" ")
  }

  const validateExpiration = React.useCallback((): boolean => {
    setExpirationError("")
    const days = Number(expirationDays) || 0
    const hours = Number(expirationHours) || 0
    const minutes = Number(expirationMinutes) || 0

    if (isNaN(days) || isNaN(hours) || isNaN(minutes)) return false
    if (minutes < 0 || minutes > 59) {
      setExpirationError(t("Minutes must be between 0 and 59"))
      return false
    }
    if (hours < 0) {
      setExpirationError(t("Hours must be between 0 and 23"))
      return false
    }
    if (days > 0 && hours > 23) {
      setExpirationError(t("Hours must be between 0 and 23"))
      return false
    }
    if (days === 0 && hours > 24) {
      setExpirationError(t("Hours must be between 0 and 24 when days is 0"))
      return false
    }
    if (days < 0 || days > 7) {
      setExpirationError(t("Days must be between 0 and 7"))
      return false
    }

    let finalDays = days
    let finalHours = hours
    if (hours === 24 && days === 0) {
      finalDays = 1
      finalHours = 0
    }
    const totalSeconds = finalDays * 24 * 60 * 60 + finalHours * 60 * 60 + minutes * 60
    if (totalSeconds > ONE_WEEK_SECONDS) {
      setExpirationError(t("Total duration cannot exceed 7 days"))
      return false
    }
    if (totalSeconds === 0) {
      setTotalExpirationSeconds(0)
      return false
    }

    setTotalExpirationSeconds(totalSeconds)
    return true
  }, [expirationDays, expirationHours, expirationMinutes, t])

  React.useEffect(() => {
    setIsExpirationValid(validateExpiration())
  }, [expirationDays, expirationHours, expirationMinutes, validateExpiration])

  const loadObjectInfo = React.useCallback(
    async (key: string) => {
      const info = await objectApi.getObjectInfo(key)
      setObject(info as Record<string, unknown>)
      setLockStatus((info as { ObjectLockLegalHoldStatus?: string })?.ObjectLockLegalHoldStatus === "ON")
      setExpirationDays(0)
      setExpirationHours(0)
      setExpirationMinutes(0)
      setSignedUrl("")
      setExpirationError("")
      setTotalExpirationSeconds(0)
      setIsExpirationValid(false)
    },
    [objectApi],
  )

  const fetchTags = React.useCallback(
    async (key: string) => {
      try {
        const response = await objectApi.getObjectTags(key)
        setTags(response)
      } catch {
        setTags([])
      }
    },
    [objectApi],
  )

  const fetchRetention = React.useCallback(
    async (key: string) => {
      try {
        const response = await objectApi.getObjectRetention(key)
        setRetention(response.Mode ?? "")
        setRetainUntilDate(response.RetainUntilDate ?? "")
        setRetentionMode(response.Mode === "COMPLIANCE" ? "COMPLIANCE" : "GOVERNANCE")
      } catch {
        setRetention("")
        setRetainUntilDate("")
      }
    },
    [objectApi],
  )

  const loadObjectInfoRef = React.useRef(loadObjectInfo)
  const fetchTagsRef = React.useRef(fetchTags)
  const fetchRetentionRef = React.useRef(fetchRetention)

  React.useEffect(() => {
    loadObjectInfoRef.current = loadObjectInfo
    fetchTagsRef.current = fetchTags
    fetchRetentionRef.current = fetchRetention
  }, [loadObjectInfo, fetchTags, fetchRetention])

  React.useEffect(() => {
    if (open && objectKey) {
      const key = objectKey
      loadObjectInfoRef
        .current(key)
        .then(() => Promise.all([fetchTagsRef.current(key), fetchRetentionRef.current(key)]))
        .catch(() => {
          message.error(t("Failed to fetch object info"))
          setObject(null)
        })
    } else {
      setObject(null)
    }
  }, [open, objectKey, message, t])

  const download = async () => {
    if (!object?.Key) return
    try {
      const url = await objectApi.getSignedUrl(object.Key as string)
      const response = await fetch(url)
      const filename = (object.Key as string).split("/").pop() ?? ""
      const headers: Record<string, string> = {
        "content-type": getContentType(response.headers, filename),
        filename: response.headers.get("content-disposition")?.split("filename=")[1] ?? "",
      }
      const blob = await response.blob()
      exportFile({ headers, data: blob }, filename)
    } catch (err) {
      message.error((err as Error)?.message ?? t("Download Failed"))
    }
  }

  const openPreview = () => {
    if (!object) return
    setPreviewObject(object)
    setShowPreview(true)
  }

  const handlePreviewVersion = async (versionId: string) => {
    if (!object?.Key) return
    try {
      const key = object.Key as string
      const version = versionId === "00000000-0000-0000-0000-000000000000" ? undefined : versionId
      const [head, signed] = await Promise.all([
        client.send(
          new HeadObjectCommand({
            Bucket: bucketName,
            Key: key,
            VersionId: version,
          }),
        ),
        getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
            VersionId: version,
          }),
          { expiresIn: 3600 },
        ),
      ])
      setPreviewObject({
        ...head,
        Key: key,
        SignedUrl: signed,
        VersionId: version,
      })
      setShowPreview(true)
    } catch (err) {
      message.error((err as Error)?.message ?? t("Failed to fetch versions"))
    }
  }

  const toggleLegalHold = async () => {
    if (!object?.Key) return
    try {
      await objectApi.setLegalHold(object.Key as string, !lockStatus)
      setLockStatus(!lockStatus)
      message.success(t("Update Success"))
    } catch (err) {
      message.error((err as Error)?.message ?? t("Update Failed"))
    }
  }

  const generateTemporaryUrl = async () => {
    if (!object?.Key) return
    if (!validateExpiration()) {
      message.error(expirationError || t("Please enter a valid expiration time"))
      return
    }
    try {
      let url: string
      const creds = permanentCredentials
      if (creds?.AccessKeyId && creds?.SecretAccessKey) {
        const siteConfig = await configManager.loadConfig()
        const tempClient = new S3Client({
          endpoint: String(siteConfig.s3.endpoint),
          region: String(siteConfig.s3.region || "us-east-1"),
          forcePathStyle: true,
          credentials: {
            accessKeyId: String(creds.AccessKeyId),
            secretAccessKey: String(creds.SecretAccessKey),
            sessionToken: typeof creds.SessionToken === "string" ? creds.SessionToken : undefined,
          },
        })
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: object.Key as string,
        })
        url = await getSignedUrl(tempClient, command, { expiresIn: totalExpirationSeconds })
      } else {
        url = await objectApi.getSignedUrl(object.Key as string, totalExpirationSeconds)
      }
      setSignedUrl(url)
      message.success(t("URL generated successfully"))
    } catch (err) {
      message.error((err as Error)?.message ?? t("Failed to generate URL"))
    }
  }

  const submitTagForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!object?.Key) return
    if (!tagFormValue.Key || !tagFormValue.Value) {
      message.error(t("Please fill in the correct format"))
      return
    }
    try {
      const nextTags = [...tags, { ...tagFormValue }]
      await objectApi.putObjectTags(object.Key as string, nextTags)
      setTags(nextTags)
      setTagFormValue({ Key: "", Value: "" })
      message.success(t("Create Success"))
    } catch (err) {
      message.error((err as Error)?.message ?? t("Create Failed"))
    }
  }

  const confirmDeleteTag = (tagKey: string) => {
    dialog.warning({
      title: t("Delete Tag"),
      content: t("Are you sure you want to delete this tag?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: () => removeTag(tagKey),
    })
  }

  const removeTag = async (tagKey: string) => {
    if (!object?.Key) return
    try {
      const nextTags = tags.filter((tag) => tag.Key !== tagKey)
      await objectApi.putObjectTags(object.Key as string, nextTags)
      setTags(nextTags)
      message.success(t("Delete Success"))
    } catch (err) {
      message.error((err as Error)?.message ?? t("Delete Failed"))
    }
  }

  const submitRetention = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!object?.Key) return
    try {
      await objectApi.putObjectRetention(object.Key as string, {
        Mode: retentionMode,
        RetainUntilDate: retainUntilDate || undefined,
      })
      message.success(t("Update Success"))
      setShowRetentionView(false)
      fetchRetention(object.Key as string)
    } catch (err) {
      message.error((err as Error)?.message ?? t("Update Failed"))
    }
  }

  const resetRetention = async () => {
    if (!object?.Key) return
    try {
      await objectApi.putObjectRetention(object.Key as string, {
        Mode: "GOVERNANCE",
      })
      message.success(t("Update Success"))
      fetchRetention(object.Key as string)
    } catch (err) {
      message.error((err as Error)?.message ?? t("Update Failed"))
    }
  }

  const lastModified = object?.LastModified ? new Date(object.LastModified as string | Date).toISOString() : ""

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="max-h-[95vh] overflow-y-auto overflow-x-hidden">
          <DrawerHeader>
            <DrawerTitle>{t("Object Details")}</DrawerTitle>
            <DrawerDescription />
          </DrawerHeader>
          <div className="min-w-0 space-y-4 p-4 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={download}>
                <RiDownloadLine className="size-4" />
                {t("Download")}
              </Button>
              <Button variant="outline" size="sm" onClick={openPreview}>
                <RiEyeLine className="size-4" />
                {t("Preview")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowTagView(true)}>
                <RiPriceTag3Line className="size-4" />
                {t("Set Tags")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowVersions(true)}>
                <RiFileList2Line className="size-4" />
                {t("Versions")}
              </Button>
              {lockStatus && (
                <Button variant="outline" size="sm" onClick={() => setShowRetentionView(true)}>
                  <RiLockLine className="size-4" />
                  {t("Retention")}
                </Button>
              )}
            </div>

            <Item variant="outline" className="flex-col items-stretch gap-4">
              <ItemHeader className="items-center">
                <ItemTitle>{t("Info")}</ItemTitle>
              </ItemHeader>
              <ItemContent className="min-w-0 space-y-3 text-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <span className="font-medium text-muted-foreground">{t("Object Name")}</span>
                  <span className="max-w-[60%] truncate" title={String(object?.Key ?? "")}>
                    {String(object?.Key ?? "")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <span className="font-medium text-muted-foreground">{t("Object Size")}</span>
                  <span>{String(object?.ContentLength ?? "-")}</span>
                </div>
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <span className="font-medium text-muted-foreground">{t("Object Type")}</span>
                  <span className="max-w-[60%] truncate" title={String(object?.ContentType ?? "")}>
                    {String(object?.ContentType ?? "-")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <span className="font-medium text-muted-foreground">ETag</span>
                  <span>{String(object?.ETag ?? "-")}</span>
                </div>
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <span className="font-medium text-muted-foreground">{t("Last Modified Time")}</span>
                  <span>{lastModified || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <span className="font-medium text-muted-foreground">{t("Legal Hold")}</span>
                  <Switch checked={lockStatus} onCheckedChange={toggleLegalHold} />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-medium text-muted-foreground">
                    {t("Retention")}
                    {t("Policy")}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span>{retention}</span>
                    {retainUntilDate && <span className="text-xs text-muted-foreground">{retainUntilDate}</span>}
                  </div>
                </div>
                <div className="border-t pt-3 flex flex-col gap-3 min-w-0">
                  <span className="font-medium text-muted-foreground">{t("Temporary URL Expiration")}</span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        max={7}
                        placeholder={t("Days")}
                        className="w-14 shrink-0"
                        value={expirationDays || ""}
                        onChange={(e) => setExpirationDays(Number(e.target.value) || 0)}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">{t("Days")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        max={expirationDays > 0 ? 23 : 24}
                        placeholder={t("Hours")}
                        className="w-14 shrink-0"
                        value={expirationHours || ""}
                        onChange={(e) => setExpirationHours(Number(e.target.value) || 0)}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">{t("Hours")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        placeholder={t("Minutes")}
                        className="w-14 shrink-0"
                        value={expirationMinutes || ""}
                        onChange={(e) => setExpirationMinutes(Number(e.target.value) || 0)}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">{t("Minutes")}</span>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={!object?.Key || !isExpirationValid}
                    onClick={generateTemporaryUrl}
                  >
                    {t("Generate URL")}
                  </Button>
                  {expirationError && <div className="text-xs text-destructive">{expirationError}</div>}
                  {totalExpirationSeconds > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {t("Total Duration")}: {formatDuration(totalExpirationSeconds)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-0 w-full">
                  <CopyInput value={signedUrl} readonly copyIcon className="min-w-0 flex-1" />
                </div>
              </ItemContent>
            </Item>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={showTagView} onOpenChange={setShowTagView}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Set Tags")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag.Key} variant="secondary" className="gap-1 pr-1">
                  {tag.Key}: {tag.Value}
                  <button
                    type="button"
                    className="hover:text-destructive transition-colors"
                    onClick={() => confirmDeleteTag(tag.Key)}
                  >
                    <RiCloseLine className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <form className="space-y-4" onSubmit={submitTagForm}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>{t("Tag Key")}</FieldLabel>
                  <FieldContent>
                    <Input
                      value={tagFormValue.Key}
                      onChange={(e) => setTagFormValue((v) => ({ ...v, Key: e.target.value }))}
                      placeholder={t("Tag Key Placeholder")}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>{t("Tag Value")}</FieldLabel>
                  <FieldContent>
                    <Input
                      value={tagFormValue.Value}
                      onChange={(e) =>
                        setTagFormValue((v) => ({
                          ...v,
                          Value: e.target.value,
                        }))
                      }
                      placeholder={t("Tag Value Placeholder")}
                    />
                  </FieldContent>
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="default">
                  {t("Add")}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRetentionView} onOpenChange={setShowRetentionView}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Retention")}</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-3" onSubmit={submitRetention}>
            <Field>
              <FieldLabel>{t("Retention Mode")}</FieldLabel>
              <FieldContent>
                <RadioGroup
                  value={retentionMode}
                  onValueChange={(v) => setRetentionMode(v as "COMPLIANCE" | "GOVERNANCE")}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {[
                    { label: t("COMPLIANCE"), value: "COMPLIANCE" },
                    { label: t("GOVERNANCE"), value: "GOVERNANCE" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-start gap-3 rounded-md border border-border/50 p-3 cursor-pointer"
                    >
                      <RadioGroupItem value={opt.value} className="mt-0.5" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>{t("Retention RetainUntilDate")}</FieldLabel>
              <FieldContent>
                <Input
                  type="datetime-local"
                  value={retainUntilDate}
                  onChange={(e) => setRetainUntilDate(e.target.value)}
                />
              </FieldContent>
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={resetRetention}>
                {t("Reset")}
              </Button>
              <Button type="submit" variant="default">
                {t("Confirm")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowRetentionView(false)}>
                {t("Cancel")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ObjectPreviewModal show={showPreview} onShowChange={setShowPreview} object={previewObject ?? object} />
      <ObjectVersions
        bucketName={bucketName}
        objectKey={(object?.Key as string) ?? ""}
        visible={showVersions}
        onClose={() => setShowVersions(false)}
        onPreview={handlePreviewVersion}
        onRefreshParent={() => objectKey && loadObjectInfo(objectKey)}
      />
    </>
  )
}
