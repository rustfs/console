/**
 * Client-side helpers for the two-factor authentication flow.
 *
 * Deliberately thin: every security decision — whether a code is valid, whether
 * a challenge is still fresh, whether an identity needs a second factor — is the
 * server's. What lives here is presentation logic (which input to show, which
 * message to render) plus the detection of the one server signal the login flow
 * has to branch on.
 *
 * Nothing here stores a TOTP secret. The secret is rendered during setup and
 * then discarded with the component; it never reaches localStorage.
 */

/** Digits in a TOTP code, mirroring the server's `TOTP_DIGITS`. */
export const TOTP_CODE_LENGTH = 6

/**
 * Significant characters in a recovery code, mirroring the server's format of
 * five dash-separated groups of four.
 */
export const RECOVERY_CODE_LENGTH = 20

/**
 * Error code the server returns from `AssumeRole` when the identity has a second
 * factor enrolled and the request carried none.
 *
 * Matched as a substring because the server embeds it in a human-readable
 * message, and because the AWS SDK surfaces STS errors with varying envelopes
 * depending on how the response is parsed.
 */
export const ERR_MFA_REQUIRED = "MultiFactorAuthRequired"

/** Characters the server's recovery-code alphabet excludes. */
const RECOVERY_ALPHABET = /^[0-9A-HJKMNP-TV-Z]+$/

/** Strip formatting so a pasted or hand-typed code can be classified. */
export function normalizeCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase()
}

/** Whether `input` has the shape of a TOTP code. */
export function looksLikeTotpCode(input: string): boolean {
  const normalized = normalizeCode(input)
  return normalized.length === TOTP_CODE_LENGTH && /^[0-9]+$/.test(normalized)
}

/** Whether `input` has the shape of a recovery code. */
export function looksLikeRecoveryCode(input: string): boolean {
  const normalized = normalizeCode(input)
  return normalized.length === RECOVERY_CODE_LENGTH && RECOVERY_ALPHABET.test(normalized)
}

/**
 * Whether `input` could be submitted at all.
 *
 * Shape-only: a well-formed code can still be wrong, and only the server knows.
 * This exists to keep the submit button from firing a request that cannot
 * possibly succeed, not to pre-judge validity.
 */
export function isSubmittableCode(input: string): boolean {
  return looksLikeTotpCode(input) || looksLikeRecoveryCode(input)
}

/**
 * Whether a failed login was a demand for a second factor rather than a
 * rejection of the credentials.
 *
 * The distinction decides whether the user sees "wrong password" or a code
 * prompt, so it checks every place the SDK might have put the server's message.
 */
export function isMfaRequiredError(error: unknown): boolean {
  return collectErrorText(error).includes(ERR_MFA_REQUIRED)
}

function collectErrorText(error: unknown): string {
  if (error == null) return ""
  if (typeof error === "string") return error

  const parts: string[] = []
  const candidate = error as {
    message?: unknown
    name?: unknown
    Code?: unknown
    code?: unknown
    Message?: unknown
    error?: unknown
    cause?: unknown
  }

  for (const value of [candidate.message, candidate.name, candidate.Code, candidate.code, candidate.Message]) {
    if (typeof value === "string") parts.push(value)
  }
  // One level of nesting only: the SDK wraps a service error in a client error,
  // but deeper recursion risks a cycle on error objects that reference a request.
  for (const nested of [candidate.error, candidate.cause]) {
    if (nested && typeof nested === "object") {
      const inner = nested as { message?: unknown; Code?: unknown; code?: unknown }
      for (const value of [inner.message, inner.Code, inner.code]) {
        if (typeof value === "string") parts.push(value)
      }
    } else if (typeof nested === "string") {
      parts.push(nested)
    }
  }

  return parts.join(" ")
}

/** Server-reported MFA state for the calling identity. */
export interface MfaStatus {
  enabled: boolean
  pending: boolean
  algorithm: string
  digits: number
  period_seconds: number
  activated_at?: string
  pending_expires_at?: string
  recovery_codes_remaining: number
  last_verified_at?: string
  enrollment_available: boolean
  enrollment_blocked_reason?: string
}

/** Response of starting an enrollment. */
export interface MfaEnrollment {
  secret_base32: string
  otpauth_uri: string
  qr_svg: string
  qr_utf8: string
  algorithm: string
  digits: number
  period_seconds: number
  expires_at: string
}

/** Server-issued login challenge. */
export interface MfaChallenge {
  required: boolean
  challenge?: string
  expires_at?: string
}

/**
 * Wrap the server's QR SVG as an image source.
 *
 * An image source, not injected markup: the SVG is server-generated today, but
 * routing it through `<img>` keeps it from ever becoming a same-origin script
 * sink, and the page needs no QR library of its own.
 */
export function qrSvgToDataUri(svg: string): string {
  // encodeURIComponent rather than btoa: the SVG can legitimately contain
  // non-Latin-1 characters, which btoa throws on.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Group a base32 secret for manual entry.
 *
 * Authenticator apps ignore the spaces, and a human transcribing 32 unbroken
 * characters will lose their place.
 */
export function formatManualSetupKey(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? []).join(" ")
}

/** Render recovery codes as a plain-text file body. */
export function formatRecoveryCodesForExport(codes: string[]): string {
  return `${codes.join("\n")}\n`
}

/** Whether the user should be nudged to generate a fresh set. */
export function recoveryCodesRunningLow(remaining: number): boolean {
  return remaining > 0 && remaining <= 3
}
