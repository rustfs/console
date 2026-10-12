"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import {
  AUDIO_CODECS,
  IMAGE_FORMATS,
  VIDEO_CODECS,
  createMediaImageVariant,
  createMediaVideoVariant,
  type ImageFormat,
  type MediaImageVariant,
  type MediaProfile,
  type MediaRule,
  type MediaVideoVariant,
} from "@/types/media-processing"
import {
  MEDIA_PIXEL_FORMATS,
  createBlankMediaRule,
  describeAudioCodec,
  describeCodec,
  describeFit,
  describeFormat,
  findMediaValidationIssue,
  formatList,
  parseList,
  validateMediaProfile,
  type MediaValidationIssue,
} from "@/lib/media-processing"

/** Comma-separated lists become a single field, which is how operators write them. */
function ListField({
  id,
  label,
  description,
  value,
  placeholder,
  disabled,
  issue,
  onChange,
}: {
  id: string
  label: string
  description?: string
  value: string[]
  placeholder?: string
  disabled?: boolean
  issue?: MediaValidationIssue
  onChange: (value: string[]) => void
}) {
  return (
    <Field data-invalid={issue ? "true" : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={formatList(value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={issue ? "true" : undefined}
        onChange={(event) => onChange(parseList(event.target.value))}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {issue ? <FieldError>{issue.message}</FieldError> : null}
    </Field>
  )
}

/** Optional whole number. An empty box means "no bound", not zero. */
function NumberField({
  id,
  label,
  description,
  value,
  min = 1,
  placeholder,
  issue,
  onChange,
}: {
  id: string
  label: string
  description?: string
  value: number | null
  min?: number
  placeholder?: string
  issue?: MediaValidationIssue
  onChange: (value: number | null) => void
}) {
  return (
    <Field data-invalid={issue ? "true" : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        placeholder={placeholder}
        value={value === null ? "" : String(value)}
        aria-invalid={issue ? "true" : undefined}
        onChange={(event) => {
          const raw = event.target.value
          if (raw.trim() === "") {
            onChange(null)
            return
          }
          const parsed = Number(raw)
          onChange(Number.isFinite(parsed) ? parsed : null)
        }}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {issue ? <FieldError>{issue.message}</FieldError> : null}
    </Field>
  )
}

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  issue,
  onChange,
}: {
  id: string
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  issue?: MediaValidationIssue
  onChange: (value: T) => void
}) {
  return (
    <Field data-invalid={issue ? "true" : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        value={value}
        aria-invalid={issue ? "true" : undefined}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {issue ? <FieldError>{issue.message}</FieldError> : null}
    </Field>
  )
}

function PixelFormatField({
  id,
  label,
  value,
  issue,
  onChange,
}: {
  id: string
  label: string
  value: string | null
  issue?: MediaValidationIssue
  onChange: (value: string | null) => void
}) {
  return (
    <Field data-invalid={issue ? "true" : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        value={value ?? ""}
        aria-invalid={issue ? "true" : undefined}
        onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
      >
        <NativeSelectOption value="">{label === "Pixel format" ? "Codec default" : "Keep source"}</NativeSelectOption>
        {MEDIA_PIXEL_FORMATS.map((format) => (
          <NativeSelectOption key={format} value={format}>
            {format}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {issue ? <FieldError>{issue.message}</FieldError> : null}
    </Field>
  )
}

function ImageVariantEditor({
  variant,
  path,
  issues,
  onChange,
  onRemove,
}: {
  variant: MediaImageVariant
  path: string
  issues: MediaValidationIssue[]
  onChange: (variant: MediaImageVariant) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const at = (field: string) => `${path}.${field}`
  const patch = (partial: Partial<MediaImageVariant>) => onChange({ ...variant, ...partial })

  return (
    <div className="grid gap-3 border p-3">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field>
            <FieldLabel htmlFor={`${path}-name`}>{t("Rendition name")}</FieldLabel>
            <Input id={`${path}-name`} value={variant.name} onChange={(e) => patch({ name: e.target.value })} />
            {findMediaValidationIssue(issues, at("name")) ? (
              <FieldError>{findMediaValidationIssue(issues, at("name"))?.message}</FieldError>
            ) : null}
          </Field>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t("Remove rendition")}>
          <RiDeleteBinLine aria-hidden />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          id={`${path}-format`}
          label={t("Format")}
          value={variant.format}
          options={IMAGE_FORMATS.map((format) => ({
            value: format as ImageFormat,
            label: describeFormat(format as ImageFormat),
          }))}
          issue={findMediaValidationIssue(issues, at("format"))}
          onChange={(format) => patch({ format })}
        />
        <NumberField
          id={`${path}-max-width`}
          label={t("Max width")}
          value={variant.max_width}
          issue={findMediaValidationIssue(issues, at("max_width"))}
          onChange={(max_width) => patch({ max_width })}
        />
        <NumberField
          id={`${path}-max-height`}
          label={t("Max height")}
          value={variant.max_height}
          issue={findMediaValidationIssue(issues, at("max_height"))}
          onChange={(max_height) => patch({ max_height })}
        />
        <SelectField
          id={`${path}-fit`}
          label={t("Fit")}
          value={variant.fit}
          options={(["contain", "cover", "fill"] as const).map((fit) => ({ value: fit, label: describeFit(fit) }))}
          onChange={(fit) => patch({ fit })}
        />
        <PixelFormatField
          id={`${path}-pixel-format`}
          label={t("Pixel format")}
          value={variant.pixel_format}
          issue={findMediaValidationIssue(issues, at("pixel_format"))}
          onChange={(pixel_format) => patch({ pixel_format })}
        />
        <Field>
          <FieldLabel htmlFor={`${path}-quality`}>{t("Quality")}</FieldLabel>
          <Input
            id={`${path}-quality`}
            value={variant.quality ?? ""}
            placeholder={t("Encoder default")}
            onChange={(e) => patch({ quality: e.target.value.trim() === "" ? null : e.target.value.trim() })}
          />
        </Field>
      </div>
    </div>
  )
}

function VideoVariantEditor({
  variant,
  path,
  issues,
  onChange,
  onRemove,
}: {
  variant: MediaVideoVariant
  path: string
  issues: MediaValidationIssue[]
  onChange: (variant: MediaVideoVariant) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const at = (field: string) => `${path}.${field}`
  const patch = (partial: Partial<MediaVideoVariant>) => onChange({ ...variant, ...partial })

  return (
    <div className="grid gap-3 border p-3">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field>
            <FieldLabel htmlFor={`${path}-name`}>{t("Rendition name")}</FieldLabel>
            <Input id={`${path}-name`} value={variant.name} onChange={(e) => patch({ name: e.target.value })} />
            {findMediaValidationIssue(issues, at("name")) ? (
              <FieldError>{findMediaValidationIssue(issues, at("name"))?.message}</FieldError>
            ) : null}
          </Field>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t("Remove rendition")}>
          <RiDeleteBinLine aria-hidden />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          id={`${path}-codec`}
          label={t("Video codec")}
          value={variant.video_codec}
          options={VIDEO_CODECS.map((codec) => ({ value: codec, label: describeCodec(codec) }))}
          issue={findMediaValidationIssue(issues, at("video_codec"))}
          onChange={(video_codec) => patch({ video_codec })}
        />
        <SelectField
          id={`${path}-audio-codec`}
          label={t("Audio codec")}
          value={variant.audio_codec}
          options={AUDIO_CODECS.map((codec) => ({ value: codec, label: describeAudioCodec(codec) }))}
          issue={findMediaValidationIssue(issues, at("audio_codec"))}
          onChange={(audio_codec) => patch({ audio_codec })}
        />
        <NumberField
          id={`${path}-max-height`}
          label={t("Max height")}
          value={variant.max_height}
          issue={findMediaValidationIssue(issues, at("max_height"))}
          onChange={(max_height) => patch({ max_height })}
        />
        <NumberField
          id={`${path}-max-width`}
          label={t("Max width")}
          value={variant.max_width}
          issue={findMediaValidationIssue(issues, at("max_width"))}
          onChange={(max_width) => patch({ max_width })}
        />
        <NumberField
          id={`${path}-max-fps`}
          label={t("Max frame rate")}
          value={variant.max_fps}
          min={1}
          placeholder={t("Keep source")}
          issue={findMediaValidationIssue(issues, at("max_fps"))}
          onChange={(max_fps) => patch({ max_fps })}
        />
        <SelectField
          id={`${path}-fit`}
          label={t("Fit")}
          value={variant.fit}
          options={(["contain", "cover", "fill"] as const).map((fit) => ({ value: fit, label: describeFit(fit) }))}
          onChange={(fit) => patch({ fit })}
        />
        <PixelFormatField
          id={`${path}-pixel-format`}
          label={t("Pixel format")}
          value={variant.pixel_format}
          issue={findMediaValidationIssue(issues, at("pixel_format"))}
          onChange={(pixel_format) => patch({ pixel_format })}
        />
        <Field>
          <FieldLabel htmlFor={`${path}-container`}>{t("Container")}</FieldLabel>
          <NativeSelect
            id={`${path}-container`}
            value={variant.container ?? ""}
            aria-invalid={findMediaValidationIssue(issues, at("container")) ? "true" : undefined}
            onChange={(e) => patch({ container: e.target.value === "" ? null : e.target.value })}
          >
            <NativeSelectOption value="">{t("MP4 (default)")}</NativeSelectOption>
            {["webm", "mkv", "mov", "avi", "ts", "flv", "ogv"].map((container) => (
              <NativeSelectOption key={container} value={container}>
                {container.toUpperCase()}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {findMediaValidationIssue(issues, at("container")) ? (
            <FieldError>{findMediaValidationIssue(issues, at("container"))?.message}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor={`${path}-crf`}>{t("Quality (CRF)")}</FieldLabel>
          <Input
            id={`${path}-crf`}
            type="number"
            min={0}
            max={63}
            value={String(variant.crf)}
            aria-invalid={findMediaValidationIssue(issues, at("crf")) ? "true" : undefined}
            onChange={(e) => patch({ crf: Number(e.target.value) })}
          />
          {findMediaValidationIssue(issues, at("crf")) ? (
            <FieldError>{findMediaValidationIssue(issues, at("crf"))?.message}</FieldError>
          ) : null}
        </Field>
      </div>
    </div>
  )
}

function RuleEditor({
  rule,
  index,
  issues,
  canEdit,
  onChange,
  onRemove,
}: {
  rule: MediaRule
  index: number
  issues: MediaValidationIssue[]
  canEdit: boolean
  onChange: (rule: MediaRule) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const path = `rules.${index}`
  const at = (field: string) => `${path}.${field}`
  const patch = (partial: Partial<MediaRule>) => onChange({ ...rule, ...partial })

  return (
    <fieldset className="grid gap-3 border p-3" data-testid={`media-rule-${index}`}>
      <legend className="px-1 text-sm font-medium">{t("Rule")}</legend>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_auto]">
        <Field>
          <FieldLabel htmlFor={`${path}-name`}>{t("Rule name")}</FieldLabel>
          <Input
            id={`${path}-name`}
            value={rule.name}
            disabled={!canEdit}
            aria-invalid={findMediaValidationIssue(issues, at("name")) ? "true" : undefined}
            onChange={(e) => patch({ name: e.target.value })}
          />
          {findMediaValidationIssue(issues, at("name")) ? (
            <FieldError>{findMediaValidationIssue(issues, at("name"))?.message}</FieldError>
          ) : null}
        </Field>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-end"
          disabled={!canEdit}
          onClick={onRemove}
          aria-label={t("Remove rule")}
        >
          <RiDeleteBinLine aria-hidden />
          {t("Remove rule")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ListField
          id={`${path}-include-prefixes`}
          label={t("Include prefixes")}
          description={t("Comma separated. Empty means any prefix.")}
          value={rule.include_prefixes}
          disabled={!canEdit}
          onChange={(include_prefixes) => patch({ include_prefixes })}
        />
        <ListField
          id={`${path}-include-suffixes`}
          label={t("Include suffixes")}
          description={t("Comma separated. Empty means any extension.")}
          value={rule.include_suffixes}
          disabled={!canEdit}
          onChange={(include_suffixes) => patch({ include_suffixes })}
        />
        <ListField
          id={`${path}-exclude-prefixes`}
          label={t("Exclude prefixes")}
          value={rule.exclude_prefixes}
          disabled={!canEdit}
          onChange={(exclude_prefixes) => patch({ exclude_prefixes })}
        />
        <ListField
          id={`${path}-exclude-suffixes`}
          label={t("Exclude suffixes")}
          value={rule.exclude_suffixes}
          disabled={!canEdit}
          onChange={(exclude_suffixes) => patch({ exclude_suffixes })}
        />
      </div>

      {findMediaValidationIssue(issues, at("renditions")) ? (
        <FieldError>{findMediaValidationIssue(issues, at("renditions"))?.message}</FieldError>
      ) : null}

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{t("Image renditions")}</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEdit}
            onClick={() =>
              patch({ images: [...rule.images, createMediaImageVariant(`image-${rule.images.length + 1}`)] })
            }
          >
            <RiAddLine aria-hidden />
            {t("Add image rendition")}
          </Button>
        </div>
        {rule.images.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("No image renditions in this rule.")}</p>
        ) : null}
        {rule.images.map((variant, variantIndex) => (
          <ImageVariantEditor
            key={`${path}-image-${variantIndex}`}
            variant={variant}
            path={`${path}.images.${variantIndex}`}
            issues={issues}
            onChange={(next) => patch({ images: rule.images.map((item, i) => (i === variantIndex ? next : item)) })}
            onRemove={() => patch({ images: rule.images.filter((_, i) => i !== variantIndex) })}
          />
        ))}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{t("Video renditions")}</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEdit}
            onClick={() =>
              patch({ videos: [...rule.videos, createMediaVideoVariant(`video-${rule.videos.length + 1}`)] })
            }
          >
            <RiAddLine aria-hidden />
            {t("Add video rendition")}
          </Button>
        </div>
        {rule.videos.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("No video renditions in this rule.")}</p>
        ) : null}
        {rule.videos.map((variant, variantIndex) => (
          <VideoVariantEditor
            key={`${path}-video-${variantIndex}`}
            variant={variant}
            path={`${path}.videos.${variantIndex}`}
            issues={issues}
            onChange={(next) => patch({ videos: rule.videos.map((item, i) => (i === variantIndex ? next : item)) })}
            onRemove={() => patch({ videos: rule.videos.filter((_, i) => i !== variantIndex) })}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t("Delete the source after deriving")}</p>
          <p className="text-xs text-muted-foreground">
            {t("The original object is removed once every rendition has been stored.")}
          </p>
        </div>
        <Switch
          checked={rule.delete_source}
          disabled={!canEdit}
          onCheckedChange={(checked) => patch({ delete_source: checked })}
          aria-label={t("Delete the source after deriving")}
        />
      </div>
    </fieldset>
  )
}

/** The rule list. Kept separate so the dialog stays about loading and saving. */
export function MediaRulesEditor({
  profile,
  issues,
  canEdit,
  onChange,
}: {
  profile: MediaProfile
  issues: MediaValidationIssue[]
  canEdit: boolean
  onChange: (profile: MediaProfile) => void
}) {
  const { t } = useTranslation()
  const patchRules = (rules: MediaRule[]) => onChange({ ...profile, rules })

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("Rules")}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canEdit}
          onClick={() => patchRules([...profile.rules, createBlankMediaRule(profile.rules.length)])}
        >
          <RiAddLine aria-hidden />
          {t("Add rule")}
        </Button>
      </div>

      {issues.find((issue) => issue.field === "rules") ? (
        <p className="text-xs text-destructive">{issues.find((issue) => issue.field === "rules")?.message}</p>
      ) : null}

      {profile.rules.map((rule, index) => (
        <RuleEditor
          key={`media-rule-${index}`}
          rule={rule}
          index={index}
          issues={issues}
          canEdit={canEdit}
          onChange={(next) => patchRules(profile.rules.map((item, i) => (i === index ? next : item)))}
          onRemove={() => patchRules(profile.rules.filter((_, i) => i !== index))}
        />
      ))}
    </div>
  )
}

export { validateMediaProfile }
