import {
  AUDIO_CODECS,
  IMAGE_FORMATS,
  VIDEO_CODECS,
  createMediaRule,
  type AudioCodec,
  type FitMode,
  type ImageFormat,
  type MediaCapabilities,
  type MediaProfile,
  type VideoCodec,
} from "@/types/media-processing"

/**
 * Pixel formats worth offering in the editor.
 *
 * This mirrors the server's accepted set. It is duplicated rather than fetched
 * because the editor has to render a dropdown before any request completes, and
 * a shorter list here is the point: these are the formats that behave
 * predictably across the decoders clients actually use.
 */
export const MEDIA_PIXEL_FORMATS = [
  "yuv420p",
  "yuv420p10le",
  "yuv422p",
  "yuv444p",
  "yuv444p10le",
  "nv12",
  "nv16",
  "nv21",
  "yuv410p",
  "yuv411p",
  "yuv440p",
  "gbrp",
  "gbrp10le",
  "rgb24",
  "rgba",
  "bgr24",
  "bgra",
  "gray",
  "gray16le",
  "yuyv422",
  "uyvy422",
  "pal8",
] as const

/** Encoders that exist on essentially every ffmpeg build, used for soft hints. */
export const COMMON_ENCODERS = ["mjpeg", "png", "bmp", "tiff", "gif", "libwebp", "libaom-av1"]

export const MEDIA_MIB = 1024 * 1024
export const MEDIA_MAX_SOURCE_BYTES = 8 * 1024 * 1024 * 1024

export interface MediaValidationIssue {
  /** Dotted path to the offending field, e.g. `rules.0.videos.1.crf`. */
  field: string
  message: string
}

const isBlank = (value: string | null | undefined) => value === null || value === undefined || value.trim() === ""

const trimmedOrNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim()
  return isBlank(trimmed) ? null : (trimmed as string)
}

function integerInRange(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max
}

/**
 * Whether the editor should offer this encoder as a plausible choice.
 *
 * The capabilities list is what the server can actually encode, so offering
 * anything else would produce a rendition the pool silently drops at render
 * time. With no capabilities yet the check is skipped rather than guessed.
 */
export function isEncoderAvailable(encoder: string | null, capabilities: MediaCapabilities | null): boolean {
  if (isBlank(encoder)) return true
  if (!capabilities?.available) return true
  return capabilities.encoders.includes(encoder as string)
}

export function describeUnavailableEncoders(
  encoders: Array<string | null>,
  capabilities: MediaCapabilities | null,
): string[] {
  if (!capabilities?.available) return []
  const missing = [
    ...new Set(encoders.map((encoder) => encoder?.trim()).filter((encoder): encoder is string => !!encoder)),
  ]
  return missing.filter((encoder) => !capabilities.encoders.includes(encoder))
}

/**
 * The encoder each image format implies, mirroring the server.
 *
 * `keep` follows the source's own format, which the editor cannot see. It is
 * represented by the encoder the generic still muxer falls back to — the one
 * every build has — so a `keep` rendition never raises a false warning.
 */
export const imageEncoder: Record<ImageFormat, string> = {
  keep: "mjpeg",
  jpeg: "mjpeg",
  png: "png",
  webp: "libwebp",
  avif: "libaom-av1",
  tiff: "tiff",
  bmp: "bmp",
  gif: "gif",
}

/** Every encoder a profile needs, for a single availability check. */
export function collectProfileEncoders(profile: MediaProfile): string[] {
  const encoders: string[] = []
  for (const rule of profile.rules) {
    for (const variant of rule.images) {
      // An explicit override replaces the format's own codec, exactly as the
      // server resolves it, so only that one has to be checked.
      encoders.push(variant.encoder?.trim() || imageEncoder[variant.format])
    }
    for (const variant of rule.videos) {
      // `copy` needs no encoder, and the codec's own name is not an encoder.
      const video = codecEncoder[variant.video_codec]
      if (video) encoders.push(video)
      const audio = audioEncoder[variant.audio_codec]
      if (audio) encoders.push(audio)
    }
  }
  return encoders.filter((encoder): encoder is string => !!encoder)
}

/** The ffmpeg encoder name each codec maps to, mirroring the server. */
export const codecEncoder: Record<VideoCodec, string | null> = {
  h264: "libx264",
  h265: "libx265",
  vp9: "libvpx-vp9",
  av1: "libsvtav1",
  mpeg4: "mpeg4",
  copy: null,
}

export const audioEncoder: Record<AudioCodec, string | null> = {
  aac: "aac",
  opus: "libopus",
  mp3: "libmp3lame",
  vorbis: "libvorbis",
  none: null,
}

/**
 * Whether a codec can be carried by a container, so the editor can warn about
 * an H.265 rendition written into a webm rather than silently producing a file
 * no player will open.
 */
export function isCodecSupportedByContainer(codec: VideoCodec, container: string | null): boolean {
  const target = (container ?? "mp4").trim().toLowerCase()
  switch (codec) {
    case "h264":
      // mp4, mov, mpegts, avi and flv all carry H.264.
      return !["webm", "ogv", "vob"].includes(target)
    case "h265":
      return ["mp4", "mov", "ts", "vob"].includes(target)
    case "vp9":
      return ["webm", "mkv", "avi"].includes(target)
    case "av1":
      return ["mp4", "mov", "mkv", "webm"].includes(target)
    case "mpeg4":
      return !["webm", "ogv", "vob"].includes(target)
    case "copy":
      return true
    default:
      return true
  }
}

/** Containers that can carry an audio track at all. */
export function containerSupportsAudio(container: string | null): boolean {
  const target = (container ?? "mp4").trim().toLowerCase()
  return !["webm", "ogv", "vob"].includes(target) || target === "webm"
}

const RULE_NAME_PATTERN = /^[\w .\-]+$/

/**
 * Validates a profile before it is sent.
 *
 * These are the failures the operator can fix; the server rejects the same
 * cases, and catching them here keeps the reason next to the field instead of
 * in a response the user has to interpret.
 */
export function validateMediaProfile(profile: MediaProfile): MediaValidationIssue[] {
  const issues: MediaValidationIssue[] = []

  if (isBlank(profile.variant_prefix)) {
    issues.push({
      field: "variant_prefix",
      message: "The variant prefix must not be empty: derived objects would collide with their sources.",
    })
  } else if (profile.variant_prefix.trim().replace(/^\/+|\/+$/g, "") === "") {
    issues.push({ field: "variant_prefix", message: "The variant prefix must contain more than slashes." })
  }

  if (!integerInRange(profile.min_source_bytes, 0, Number.MAX_SAFE_INTEGER)) {
    issues.push({ field: "min_source_bytes", message: "The minimum source size must be a whole number of bytes." })
  }
  if (!integerInRange(profile.max_source_bytes, 1, Number.MAX_SAFE_INTEGER)) {
    issues.push({ field: "max_source_bytes", message: "The maximum source size must be a whole number of bytes." })
  }
  if (
    Number.isSafeInteger(profile.min_source_bytes) &&
    Number.isSafeInteger(profile.max_source_bytes) &&
    profile.min_source_bytes >= profile.max_source_bytes
  ) {
    issues.push({ field: "max_source_bytes", message: "The minimum source size must be smaller than the maximum." })
  }
  if (!Number.isFinite(profile.min_variant_ratio) || profile.min_variant_ratio <= 0 || profile.min_variant_ratio > 1) {
    issues.push({ field: "min_variant_ratio", message: "The variant ratio must be greater than 0 and at most 1." })
  }

  if (profile.rules.length === 0) {
    issues.push({ field: "rules", message: "At least one rule must define an image or video rendition." })
  }

  const ruleNames = new Set<string>()
  profile.rules.forEach((rule, ruleIndex) => {
    const at = (field: string) => `rules.${ruleIndex}.${field}`

    if (isBlank(rule.name)) {
      issues.push({ field: at("name"), message: "The rule needs a name." })
    } else if (!RULE_NAME_PATTERN.test(rule.name)) {
      issues.push({
        field: at("name"),
        message: "The rule name may contain letters, numbers, spaces, dots, dashes and underscores only.",
      })
    } else if (ruleNames.has(rule.name)) {
      issues.push({ field: at("name"), message: `Another rule is already named "${rule.name}".` })
    } else {
      ruleNames.add(rule.name)
    }

    if (rule.images.length === 0 && rule.videos.length === 0) {
      issues.push({ field: at("renditions"), message: "The rule defines no renditions, so it produces nothing." })
    }

    const renditionNames = new Set<string>()
    rule.images.forEach((variant, variantIndex) => {
      const vat = (field: string) => `${at(`images.${variantIndex}`)}.${field}`
      issues.push(...validateRenditionName(variant.name, vat("name"), renditionNames))
      issues.push(...validateBounds(variant.max_width, variant.max_height, vat("max_width"), vat("max_height")))
      if (!IMAGE_FORMATS.includes(variant.format)) {
        issues.push({ field: vat("format"), message: `Unknown image format "${variant.format}".` })
      }
      issues.push(...validatePixelFormat(variant.pixel_format, vat("pixel_format")))
    })

    rule.videos.forEach((variant, variantIndex) => {
      const vat = (field: string) => `${at(`videos.${variantIndex}`)}.${field}`
      issues.push(...validateRenditionName(variant.name, vat("name"), renditionNames))
      issues.push(...validateBounds(variant.max_width, variant.max_height, vat("max_width"), vat("max_height")))
      if (!VIDEO_CODECS.includes(variant.video_codec)) {
        issues.push({ field: vat("video_codec"), message: `Unknown video codec "${variant.video_codec}".` })
      }
      if (!AUDIO_CODECS.includes(variant.audio_codec)) {
        issues.push({ field: vat("audio_codec"), message: `Unknown audio codec "${variant.audio_codec}".` })
      }
      if (!integerInRange(variant.crf, 0, 63)) {
        issues.push({ field: vat("crf"), message: "The CRF must be a whole number from 0 to 63." })
      }
      if (isBlank(variant.audio_bitrate) && variant.audio_codec !== "none") {
        issues.push({ field: vat("audio_bitrate"), message: "The audio bitrate is required unless audio is disabled." })
      }
      if (variant.max_fps !== null) {
        const fps = variant.max_fps
        if (!Number.isFinite(fps) || fps < 1 || fps > 480) {
          issues.push({
            field: vat("max_fps"),
            message: "The frame-rate cap must be between 1 and 480 frames per second.",
          })
        }
      }
      issues.push(...validatePixelFormat(variant.pixel_format, vat("pixel_format")))

      const container = trimmedOrNull(variant.container)
      if (container && !isCodecSupportedByContainer(variant.video_codec, container)) {
        issues.push({
          field: vat("container"),
          message: `A ${variant.video_codec} rendition cannot be muxed into a ${container} container.`,
        })
      }
      if (variant.audio_codec === "none" && container && !containerSupportsAudio(container)) {
        issues.push({
          field: vat("audio_codec"),
          message: `A ${container} container has no audio track to remove.`,
        })
      }
    })
  })

  return issues
}

function validateRenditionName(name: string, field: string, seen: Set<string>): MediaValidationIssue[] {
  if (isBlank(name)) return [{ field, message: "The rendition needs a name; it names the stored object." }]
  if (!RULE_NAME_PATTERN.test(name)) {
    return [
      { field, message: "The rendition name may contain letters, numbers, spaces, dots, dashes and underscores only." },
    ]
  }
  if (seen.has(name)) return [{ field, message: `Another rendition in this rule is already named "${name}".` }]
  seen.add(name)
  return []
}

function validateBounds(
  maxWidth: number | null,
  maxHeight: number | null,
  widthField: string,
  heightField: string,
): MediaValidationIssue[] {
  const issues: MediaValidationIssue[] = []
  if (maxWidth !== null && (!Number.isSafeInteger(maxWidth) || maxWidth <= 0)) {
    issues.push({ field: widthField, message: "The width bound must be a positive whole number of pixels." })
  }
  if (maxHeight !== null && (!Number.isSafeInteger(maxHeight) || maxHeight <= 0)) {
    issues.push({ field: heightField, message: "The height bound must be a positive whole number of pixels." })
  }
  return issues
}

function validatePixelFormat(pixelFormat: string | null, field: string): MediaValidationIssue[] {
  const requested = trimmedOrNull(pixelFormat)
  if (!requested) return []
  const normalized = requested.toLowerCase()
  if (MEDIA_PIXEL_FORMATS.includes(normalized as (typeof MEDIA_PIXEL_FORMATS)[number])) return []
  return [
    {
      field,
      message: `"${requested}" is not a pixel format this server accepts. Supported: ${MEDIA_PIXEL_FORMATS.join(", ")}.`,
    },
  ]
}

export function findMediaValidationIssue(
  issues: MediaValidationIssue[],
  field: string,
): MediaValidationIssue | undefined {
  return issues.find((issue) => issue.field === field)
}

/** Splits a comma-separated list, dropping blanks. */
export function parseList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export function formatList(values: string[]): string {
  return values.join(", ")
}

export type MediaProcessingErrorKind =
  | "configuration_missing"
  | "toolchain_unavailable"
  | "invalid_argument"
  | "access_denied"
  | "unknown"

interface ErrorLike {
  status?: unknown
  code?: unknown
  message?: unknown
}

export function getMediaProcessingErrorKind(error: unknown): MediaProcessingErrorKind {
  if (!error || typeof error !== "object") return "unknown"
  const candidate = error as ErrorLike
  const status = typeof candidate.status === "number" ? candidate.status : undefined
  const code = typeof candidate.code === "string" ? candidate.code : ""
  const message = typeof candidate.message === "string" ? candidate.message : ""

  if (code === "NoSuchMediaProcessingConfiguration") return "configuration_missing"
  if (code === "InvalidArgument" || status === 400) return "invalid_argument"
  if (code === "AccessDenied" || status === 403) return "access_denied"
  if (status === 503) return "toolchain_unavailable"
  if (/ffmpeg|ffprobe|toolchain|media processing is unavailable/i.test(message)) return "toolchain_unavailable"
  return "unknown"
}

/**
 * Whether the server simply does not have this feature.
 *
 * An older server answers 404 for a route it never had, which is a normal state
 * during a rolling upgrade and must not be shown as an error.
 */
export function isMediaProcessingRouteMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const candidate = error as ErrorLike
  return (
    candidate.status === 404 &&
    candidate.code !== "NoSuchMediaProcessingConfiguration" &&
    candidate.code !== "NoSuchBucket"
  )
}

/** Sensible starting point when an operator adds their first rule by hand. */
export function createBlankMediaRule(index: number): ReturnType<typeof createMediaRule> {
  const rule = createMediaRule(`rule-${index + 1}`)
  rule.images = []
  rule.videos = []
  return rule
}

export function describeFormat(format: ImageFormat): string {
  return format === "keep" ? "Keep source" : format.toUpperCase()
}

export function describeCodec(codec: VideoCodec): string {
  switch (codec) {
    case "h264":
      return "H.264"
    case "h265":
      return "H.265 / HEVC"
    case "vp9":
      return "VP9"
    case "av1":
      return "AV1"
    case "mpeg4":
      return "MPEG-4"
    case "copy":
      return "Copy without re-encoding"
    default:
      return codec
  }
}

export function describeAudioCodec(codec: AudioCodec): string {
  switch (codec) {
    case "aac":
      return "AAC"
    case "opus":
      return "Opus"
    case "mp3":
      return "MP3"
    case "vorbis":
      return "Vorbis"
    case "none":
      return "Remove audio"
    default:
      return codec
  }
}

export function describeFit(fit: FitMode): string {
  switch (fit) {
    case "contain":
      return "Fit inside"
    case "cover":
      return "Fill and crop"
    case "fill":
      return "Stretch"
    default:
      return fit
  }
}
