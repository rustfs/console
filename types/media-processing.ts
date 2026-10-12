/**
 * Server-side media processing: the per-bucket profile that derives image and
 * video renditions from stored objects.
 *
 * Field names mirror the admin API's snake_case JSON. The API also accepts
 * camelCase on input, but responses are always snake_case, so the console reads
 * and writes snake_case throughout.
 */

/** Image containers a rendition can be written as. */
export type ImageFormat = "keep" | "jpeg" | "png" | "webp" | "avif" | "tiff" | "bmp" | "gif"

/** How a rendition's bounds relate to the source aspect ratio. */
export type FitMode = "contain" | "cover" | "fill"

/** Video codecs a rendition can target. */
export type VideoCodec = "h264" | "h265" | "vp9" | "av1" | "mpeg4" | "copy"

/** Audio codecs a rendition can target. */
export type AudioCodec = "aac" | "opus" | "mp3" | "vorbis" | "none"

export const IMAGE_FORMATS: ImageFormat[] = ["keep", "jpeg", "png", "webp", "avif", "tiff", "bmp", "gif"]
export const FIT_MODES: FitMode[] = ["contain", "cover", "fill"]
export const VIDEO_CODECS: VideoCodec[] = ["h264", "h265", "vp9", "av1", "mpeg4", "copy"]
export const AUDIO_CODECS: AudioCodec[] = ["aac", "opus", "mp3", "vorbis", "none"]

/** Containers a video rendition can be muxed into. */
export const VIDEO_CONTAINERS = ["mp4", "mov", "webm", "mkv", "avi", "ts", "flv", "ogv", "wmv", "vob", "3gp"] as const

export interface MediaImageVariant {
  name: string
  /** Upper bounds; a source smaller than the bound is never scaled up. */
  max_width: number | null
  max_height: number | null
  format: ImageFormat
  fit: FitMode
  /** Overrides the encoder implied by `format`, for builds that lack one. */
  encoder: string | null
  /** Quality in whatever scale the target codec uses. */
  quality: string | null
  /** Output pixel format, e.g. `gray` for a monochrome thumbnail. */
  pixel_format: string | null
  scale_algorithm: string | null
}

export interface MediaVideoVariant {
  name: string
  max_height: number | null
  /** The long axis of a vertical clip. */
  max_width: number | null
  fit: FitMode
  video_codec: VideoCodec
  /** `none` drops the audio track. */
  audio_codec: AudioCodec
  pixel_format: string | null
  container: string | null
  crf: number
  preset: string
  audio_bitrate: string
  max_fps: number | null
}

export interface MediaRule {
  name: string
  /** Empty means "any prefix" / "any suffix". */
  include_prefixes: string[]
  include_suffixes: string[]
  exclude_prefixes: string[]
  exclude_suffixes: string[]
  images: MediaImageVariant[]
  videos: MediaVideoVariant[]
  /** Delete the source once every variant has been stored. */
  delete_source: boolean
}

export interface MediaKeyPattern {
  pattern: string
  negate: boolean
}

export interface MediaProfile {
  enabled: boolean
  /**
   * Prefix derived objects are stored under. Variants live in the same bucket
   * so policies, lifecycle rules and presigned URLs apply to them unchanged.
   */
  variant_prefix: string
  /** Evaluated in order; the first rule that claims a key wins. */
  rules: MediaRule[]
  include: MediaKeyPattern[]
  exclude: MediaKeyPattern[]
  min_source_bytes: number
  max_source_bytes: number
  /** A rendition must be smaller than this fraction of its source to be stored. */
  min_variant_ratio: number
}

export interface MediaProcessingGetResponse {
  bucket: string
  config: MediaProfile
  updated_at: string
}

export interface MediaProcessingSetResponse {
  bucket: string
  config: MediaProfile
  updated_at: string
}

/** What the server's local ffmpeg can actually produce. */
export interface MediaCapabilities {
  /** False when no usable ffmpeg was reachable; nothing will be derived. */
  available: boolean
  /** Whether the worker pool is started. */
  running: boolean
  encoders: string[]
  /** Pixel formats a rendition may name in `pixel_format`. */
  pixel_formats: string[]
}

/**
 * The default profile the API returns for an empty body. Mirrors the server's
 * own `MediaProfile::default`, so "reset to defaults" here and the server agree.
 */
export const MEDIA_PROFILE_DEFAULTS: MediaProfile = {
  enabled: true,
  variant_prefix: "variants",
  rules: [
    {
      name: "media-host",
      include_prefixes: [],
      include_suffixes: [],
      exclude_prefixes: [],
      exclude_suffixes: [],
      images: [
        {
          name: "thumb",
          max_width: 320,
          max_height: null,
          format: "webp",
          fit: "contain",
          encoder: null,
          quality: null,
          pixel_format: null,
          scale_algorithm: null,
        },
        {
          name: "thumb-jpeg",
          max_width: 320,
          max_height: null,
          format: "jpeg",
          fit: "contain",
          encoder: null,
          quality: null,
          pixel_format: null,
          scale_algorithm: null,
        },
        {
          name: "medium",
          max_width: 1280,
          max_height: null,
          format: "webp",
          fit: "contain",
          encoder: null,
          quality: null,
          pixel_format: null,
          scale_algorithm: null,
        },
        {
          name: "medium-jpeg",
          max_width: 1280,
          max_height: null,
          format: "jpeg",
          fit: "contain",
          encoder: null,
          quality: null,
          pixel_format: null,
          scale_algorithm: null,
        },
        {
          name: "large",
          max_width: 2560,
          max_height: null,
          format: "keep",
          fit: "contain",
          encoder: null,
          quality: null,
          pixel_format: null,
          scale_algorithm: null,
        },
      ],
      videos: [
        {
          name: "480p",
          max_height: 480,
          max_width: null,
          fit: "contain",
          video_codec: "h264",
          audio_codec: "aac",
          pixel_format: null,
          container: null,
          crf: 23,
          preset: "veryfast",
          audio_bitrate: "128k",
          max_fps: null,
        },
        {
          name: "720p",
          max_height: 720,
          max_width: null,
          fit: "contain",
          video_codec: "h264",
          audio_codec: "aac",
          pixel_format: null,
          container: null,
          crf: 23,
          preset: "veryfast",
          audio_bitrate: "128k",
          max_fps: null,
        },
        {
          name: "1080p",
          max_height: 1080,
          max_width: null,
          fit: "contain",
          video_codec: "h264",
          audio_codec: "aac",
          pixel_format: null,
          container: null,
          crf: 23,
          preset: "veryfast",
          audio_bitrate: "128k",
          max_fps: null,
        },
      ],
      delete_source: false,
    },
  ],
  include: [],
  exclude: [],
  min_source_bytes: 1024,
  max_source_bytes: 8589934592,
  min_variant_ratio: 0.95,
}

/** Deep copy, so an editor can mutate freely without touching the defaults. */
export function createMediaProfileDefaults(): MediaProfile {
  return structuredClone(MEDIA_PROFILE_DEFAULTS)
}

export function createMediaImageVariant(name = "rendition"): MediaImageVariant {
  return {
    name,
    max_width: 1280,
    max_height: null,
    format: "jpeg",
    fit: "contain",
    encoder: null,
    quality: null,
    pixel_format: null,
    scale_algorithm: null,
  }
}

export function createMediaVideoVariant(name = "rendition"): MediaVideoVariant {
  return {
    name,
    max_height: 720,
    max_width: null,
    fit: "contain",
    video_codec: "h264",
    audio_codec: "aac",
    pixel_format: null,
    container: null,
    crf: 23,
    preset: "veryfast",
    audio_bitrate: "128k",
    max_fps: null,
  }
}

export function createMediaRule(name = "rule"): MediaRule {
  return {
    name,
    include_prefixes: [],
    include_suffixes: [],
    exclude_prefixes: [],
    exclude_suffixes: [],
    images: [],
    videos: [],
    delete_source: false,
  }
}
