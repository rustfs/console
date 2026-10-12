import test from "node:test"
import assert from "node:assert/strict"

import {
  collectProfileEncoders,
  describeUnavailableEncoders,
  findMediaValidationIssue,
  formatList,
  getMediaProcessingErrorKind,
  isCodecSupportedByContainer,
  isMediaProcessingRouteMissing,
  parseList,
  validateMediaProfile,
} from "../../lib/media-processing"
import {
  MEDIA_PROFILE_DEFAULTS,
  createMediaProfileDefaults,
  createMediaVideoVariant,
  type MediaProfile,
} from "../../types/media-processing"

function profile(mutate: (draft: MediaProfile) => void = () => {}): MediaProfile {
  const draft = createMediaProfileDefaults()
  mutate(draft)
  return draft
}

test("the default profile validates", () => {
  assert.deepEqual(validateMediaProfile(profile()), [])
})

test("the defaults are not shared mutable state", () => {
  const first = createMediaProfileDefaults()
  first.variant_prefix = "changed"
  first.rules[0].images[0].name = "changed"

  const second = createMediaProfileDefaults()
  assert.equal(second.variant_prefix, "variants")
  assert.equal(second.rules[0].images[0].name, "thumb")
  assert.equal(MEDIA_PROFILE_DEFAULTS.variant_prefix, "variants")
})

test("an empty variant prefix is refused", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.variant_prefix = "  "
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "variant_prefix"))
})

test("a prefix of only slashes is refused", () => {
  // The prefix is joined with the source key, so slashes alone would place
  // every variant directly in the bucket root.
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.variant_prefix = "///"
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "variant_prefix"))
})

test("an inverted size window is refused", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.min_source_bytes = 10_000
      draft.max_source_bytes = 1_000
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "max_source_bytes"))
})

test("a size saving outside 0..1 is refused", () => {
  const tooBig = validateMediaProfile(
    profile((draft) => {
      draft.min_variant_ratio = 1.5
    }),
  )
  assert.ok(findMediaValidationIssue(tooBig, "min_variant_ratio"))

  const zero = validateMediaProfile(
    profile((draft) => {
      draft.min_variant_ratio = 0
    }),
  )
  assert.ok(findMediaValidationIssue(zero, "min_variant_ratio"))
})

test("a profile with no rules is refused", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules = []
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "rules"))
})

test("a rule that produces nothing is reported", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].images = []
      draft.rules[0].videos = []
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "rules.0.renditions"))
})

test("duplicate rule and rendition names are refused", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules.push(structuredClone(draft.rules[0]))
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "rules.1.name"))

  const withinRule = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].images[1].name = draft.rules[0].images[0].name
    }),
  )
  assert.ok(findMediaValidationIssue(withinRule, "rules.0.images.1.name"))
})

test("a rendition with no size bound and no format change is allowed", () => {
  // The server decides whether such a rendition is worth rendering; refusing it
  // here would stop a legitimate "always remux to webm" rule.
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].videos = [
        {
          ...createMediaVideoVariant("web"),
          max_height: null,
          video_codec: "vp9",
          container: "webm",
        },
      ]
    }),
  )
  assert.deepEqual(issues, [])
})

test("an unknown pixel format is refused with the supported list", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].videos[0].pixel_format = "yuv420"
    }),
  )
  const issue = findMediaValidationIssue(issues, "rules.0.videos.0.pixel_format")
  assert.ok(issue)
  assert.match(issue?.message ?? "", /yuv420p/)
})

test("a pixel format is matched case-insensitively", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].videos[0].pixel_format = "YUV420P10LE"
    }),
  )
  assert.deepEqual(issues, [])
})

test("a CRF outside the encoder range is refused", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].videos[0].crf = 200
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "rules.0.videos.0.crf"))
})

test("a frame-rate cap below one frame per second is refused", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].videos[0].max_fps = 0.5
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "rules.0.videos.0.max_fps"))
})

test("a codec that cannot live in the chosen container is refused", () => {
  // VP9 in an mp4 is not playable, and the server would silently produce a file
  // no browser opens.
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].videos[0].video_codec = "vp9"
      draft.rules[0].videos[0].container = "mp4"
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "rules.0.videos.0.container"))
})

test("a codec that fits its container is accepted", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].videos[0].video_codec = "vp9"
      draft.rules[0].videos[0].container = "webm"
    }),
  )
  assert.deepEqual(issues, [])
})

test("removing audio from an audio-less container is refused", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].videos[0].audio_codec = "none"
      draft.rules[0].videos[0].container = "ogv"
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "rules.0.videos.0.audio_codec"))
})

test("container and codec compatibility is decided case-insensitively", () => {
  assert.equal(isCodecSupportedByContainer("vp9", "WEBM"), true)
  assert.equal(isCodecSupportedByContainer("vp9", "Mp4"), false)
  // A copy renders whatever the source carries, so any container is possible.
  assert.equal(isCodecSupportedByContainer("copy", "ogv"), true)
})

test("a negative size bound is refused", () => {
  const issues = validateMediaProfile(
    profile((draft) => {
      draft.rules[0].images[0].max_width = -10
    }),
  )
  assert.ok(findMediaValidationIssue(issues, "rules.0.images.0.max_width"))
})

test("every encoder a profile references is collected", () => {
  const encoders = collectProfileEncoders(profile())
  // The default profile targets H.264/AAC video and JPEG/WebP stills.
  assert.ok(encoders.includes("libx264"))
  assert.ok(encoders.includes("aac"))
  assert.ok(encoders.includes("mjpeg"))
  assert.ok(encoders.includes("libwebp"))
})

test("a copy rendition contributes no encoder", () => {
  const encoders = collectProfileEncoders(
    profile((draft) => {
      draft.rules[0].videos = [{ ...createMediaVideoVariant("copy"), video_codec: "copy" }]
    }),
  )
  assert.ok(!encoders.includes("libx264"))
})

test("encoders this server lacks are named so a silent drop is visible", () => {
  const missing = describeUnavailableEncoders(["libx264", "libsvtav1", "libnotreal"], {
    available: true,
    running: true,
    encoders: ["libx264", "aac"],
    pixel_formats: [],
  })
  assert.deepEqual(missing, ["libsvtav1", "libnotreal"])
})

test("nothing is reported as missing while the toolchain is unknown", () => {
  // Claiming a problem here would show a warning the server cannot confirm.
  assert.deepEqual(
    describeUnavailableEncoders(["libnotreal"], { available: false, running: false, encoders: [], pixel_formats: [] }),
    [],
  )
  assert.deepEqual(describeUnavailableEncoders(["libnotreal"], null), [])
})

test("a server without the route is reported as absent rather than broken", () => {
  assert.equal(isMediaProcessingRouteMissing({ status: 404 }), true)
  assert.equal(isMediaProcessingRouteMissing({ status: 404, code: "NoSuchMediaProcessingConfiguration" }), false)
  assert.equal(isMediaProcessingRouteMissing({ status: 404, code: "NoSuchBucket" }), false)
  assert.equal(isMediaProcessingRouteMissing({ status: 500 }), false)
})

test("server errors map to the kinds the UI explains", () => {
  assert.equal(getMediaProcessingErrorKind({ code: "NoSuchMediaProcessingConfiguration" }), "configuration_missing")
  assert.equal(getMediaProcessingErrorKind({ code: "InvalidArgument" }), "invalid_argument")
  assert.equal(getMediaProcessingErrorKind({ status: 503 }), "toolchain_unavailable")
  assert.equal(getMediaProcessingErrorKind({ code: "AccessDenied" }), "access_denied")
  assert.equal(
    getMediaProcessingErrorKind(new Error("media processing is unavailable: ffmpeg")),
    "toolchain_unavailable",
  )
  assert.equal(getMediaProcessingErrorKind(new Error("boom")), "unknown")
  assert.equal(getMediaProcessingErrorKind(null), "unknown")
})

test("comma separated lists round-trip through the editor field", () => {
  assert.deepEqual(parseList(" a , b ,, c "), ["a", "b", "c"])
  assert.deepEqual(parseList(""), [])
  assert.equal(formatList(["a", "b"]), "a, b")
  assert.equal(formatList(parseList("x, y")), "x, y")
})
