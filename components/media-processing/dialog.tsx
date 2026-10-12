"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { useMediaProcessing } from "@/hooks/use-media-processing"
import { usePermissions } from "@/hooks/use-permissions"
import {
  collectProfileEncoders,
  describeUnavailableEncoders,
  findMediaValidationIssue,
  getMediaProcessingErrorKind,
  validateMediaProfile,
  type MediaValidationIssue,
} from "@/lib/media-processing"
import {
  createMediaProfileDefaults,
  type MediaCapabilities,
  type MediaProcessingGetResponse,
} from "@/types/media-processing"

import { MediaRulesEditor } from "./rules-editor"

/**
 * Reports which of the profile's encoders this server cannot produce.
 *
 * The server silently drops a rendition it has no encoder for, so a profile
 * that looks correct can quietly derive nothing. Saying so here is the
 * difference between a five-second fix and a support ticket.
 */
function MissingEncodersAlert({
  profile,
  capabilities,
}: {
  profile: MediaProfileLike
  capabilities: MediaCapabilities
}) {
  const { t } = useTranslation()
  const missing = describeUnavailableEncoders(collectProfileEncoders(profile), capabilities)
  if (missing.length === 0) return null

  return (
    <Alert variant="destructive">
      <AlertTitle>{t("This server cannot encode every format in this profile")}</AlertTitle>
      <AlertDescription>
        {t("These renditions will be skipped until the server can encode them: {encoders}", {
          encoders: missing.join(", "),
        })}
      </AlertDescription>
    </Alert>
  )
}

type MediaProfileLike = ReturnType<typeof createMediaProfileDefaults>

export function MediaProcessingDialog({
  open,
  onOpenChange,
  bucketName,
  initialConfig,
  capabilities,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketName: string
  initialConfig: MediaProcessingGetResponse | null
  capabilities: MediaCapabilities | null
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { setConfig, deleteConfig } = useMediaProcessing()
  const { canCapability } = usePermissions()
  const canEdit = canCapability("bucket.mediaProcessing.edit")

  // Re-seeded on each open so an abandoned edit does not leak into the next one.
  const [profile, setProfile] = React.useState<MediaProfileLike>(() =>
    initialConfig ? structuredClone(initialConfig.config) : createMediaProfileDefaults(),
  )
  const [saving, setSaving] = React.useState(false)
  const [showIssues, setShowIssues] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setProfile(initialConfig ? structuredClone(initialConfig.config) : createMediaProfileDefaults())
    setShowIssues(false)
  }, [initialConfig, open])

  const issues: MediaValidationIssue[] = React.useMemo(() => validateMediaProfile(profile), [profile])
  const issueFor = (field: string) => (showIssues ? findMediaValidationIssue(issues, field) : undefined)

  const save = React.useCallback(async () => {
    if (issues.length > 0) {
      setShowIssues(true)
      message.error(t("Fix the highlighted fields before saving."))
      return
    }
    setSaving(true)
    try {
      await setConfig(bucketName, profile)
      message.success(t("Media processing settings saved."))
      onSaved()
      onOpenChange(false)
    } catch (error) {
      // The server is the authority on what it accepts; its message is more
      // specific than anything the editor could pre-empt, so surface it as-is.
      if (getMediaProcessingErrorKind(error) === "invalid_argument") {
        setShowIssues(true)
      }
      message.error(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }, [bucketName, issues.length, message, onOpenChange, onSaved, profile, setConfig, t])

  const remove = React.useCallback(() => {
    dialog.error({
      title: t("Remove media processing?"),
      content: t("Renditions stop being derived for new uploads. Objects already derived stay in the bucket."),
      positiveText: t("Remove"),
      negativeText: t("Cancel"),
      onPositiveClick: async () => {
        await deleteConfig(bucketName)
        message.success(t("Media processing removed."))
        onSaved()
        onOpenChange(false)
      },
    })
  }, [bucketName, deleteConfig, dialog, message, onOpenChange, onSaved, t])

  const toolchainDown = capabilities !== null && !capabilities.available
  const poolStopped = capabilities?.available === true && !capabilities.running

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("Media processing")}</DialogTitle>
          <DialogDescription>
            {t("Derive thumbnails, resolution ladders and browser-playable video from stored objects.")} {bucketName}
          </DialogDescription>
        </DialogHeader>

        {toolchainDown ? (
          <Alert variant="destructive">
            <AlertTitle>{t("This server has no usable ffmpeg")}</AlertTitle>
            <AlertDescription>
              {t("Renditions cannot be derived until ffmpeg is installed and RUSTFS_MEDIA_FFMPEG points at it.")}
            </AlertDescription>
          </Alert>
        ) : null}

        {poolStopped && !toolchainDown ? (
          <Alert>
            <AlertTitle>{t("The worker pool is not running")}</AlertTitle>
            <AlertDescription>
              {t("Settings are saved, but no renditions will be produced until the pool starts.")}
            </AlertDescription>
          </Alert>
        ) : null}

        {capabilities?.available ? <MissingEncodersAlert profile={profile} capabilities={capabilities} /> : null}

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3 border p-3">
            <div>
              <p className="text-sm font-medium">{t("Derive renditions on upload")}</p>
              <p className="text-xs text-muted-foreground">
                {t("New objects matching a rule are processed in the background after they are stored.")}
              </p>
            </div>
            <Switch
              checked={profile.enabled}
              disabled={!canEdit}
              onCheckedChange={(checked) => setProfile({ ...profile, enabled: checked })}
              aria-label={t("Derive renditions on upload")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field data-invalid={issueFor("variant_prefix") ? "true" : undefined}>
              <FieldLabel htmlFor="media-variant-prefix">{t("Variant prefix")}</FieldLabel>
              <Input
                id="media-variant-prefix"
                value={profile.variant_prefix}
                disabled={!canEdit}
                aria-invalid={issueFor("variant_prefix") ? "true" : undefined}
                onChange={(e) => setProfile({ ...profile, variant_prefix: e.target.value })}
              />
              <FieldDescription>
                {t(
                  "Derived objects are stored under this prefix in the same bucket, so existing policies and presigned URLs apply to them.",
                )}
              </FieldDescription>
              {issueFor("variant_prefix") ? <FieldError>{issueFor("variant_prefix")?.message}</FieldError> : null}
            </Field>

            <Field data-invalid={issueFor("min_variant_ratio") ? "true" : undefined}>
              <FieldLabel htmlFor="media-min-ratio">{t("Minimum size saving")}</FieldLabel>
              <Input
                id="media-min-ratio"
                type="number"
                min={0.01}
                max={1}
                step={0.01}
                value={String(profile.min_variant_ratio)}
                disabled={!canEdit}
                aria-invalid={issueFor("min_variant_ratio") ? "true" : undefined}
                onChange={(e) => setProfile({ ...profile, min_variant_ratio: Number(e.target.value) })}
              />
              <FieldDescription>
                {t(
                  "A rendition is stored only when it is smaller than this fraction of its source. Conversions are always kept.",
                )}
              </FieldDescription>
              {issueFor("min_variant_ratio") ? <FieldError>{issueFor("min_variant_ratio")?.message}</FieldError> : null}
            </Field>

            <Field data-invalid={issueFor("min_source_bytes") ? "true" : undefined}>
              <FieldLabel htmlFor="media-min-size">{t("Smallest source")}</FieldLabel>
              <Input
                id="media-min-size"
                type="number"
                min={0}
                value={String(profile.min_source_bytes)}
                disabled={!canEdit}
                aria-invalid={issueFor("min_source_bytes") ? "true" : undefined}
                onChange={(e) => setProfile({ ...profile, min_source_bytes: Number(e.target.value) })}
              />
              <FieldDescription>{t("Objects below this size are not decoded.")}</FieldDescription>
              {issueFor("min_source_bytes") ? <FieldError>{issueFor("min_source_bytes")?.message}</FieldError> : null}
            </Field>

            <Field data-invalid={issueFor("max_source_bytes") ? "true" : undefined}>
              <FieldLabel htmlFor="media-max-size">{t("Largest source")}</FieldLabel>
              <Input
                id="media-max-size"
                type="number"
                min={1}
                value={String(profile.max_source_bytes)}
                disabled={!canEdit}
                aria-invalid={issueFor("max_source_bytes") ? "true" : undefined}
                onChange={(e) => setProfile({ ...profile, max_source_bytes: Number(e.target.value) })}
              />
              <FieldDescription>
                {t("Objects above this size are skipped to bound the cost of one upload.")}
              </FieldDescription>
              {issueFor("max_source_bytes") ? <FieldError>{issueFor("max_source_bytes")?.message}</FieldError> : null}
            </Field>
          </div>

          <MediaRulesEditor
            profile={profile}
            issues={showIssues ? issues : []}
            canEdit={canEdit}
            onChange={setProfile}
          />
        </div>

        <DialogFooter>
          {initialConfig && canEdit ? (
            <Button type="button" variant="destructive" onClick={remove} disabled={saving}>
              {t("Remove")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={save} disabled={saving || !canEdit}>
            {saving ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
