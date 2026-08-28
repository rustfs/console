"use client"

import { useCallback } from "react"
import { useApiOptional } from "@/contexts/api-context"
import type { MfaChallenge, MfaEnrollment, MfaStatus } from "@/lib/mfa"

/** Where the calling identity's long-term secret lives. */
export type CredentialsSource = "env" | "iam"

/** Which kind of credential is making the request. */
export type IdentityType = "root" | "iam" | "sts" | "service-account"

export interface AccountMutability {
  password: boolean
  username: boolean
}

export interface AccountMfaSummary {
  enabled: boolean
  pending: boolean
  activated_at?: string
  recovery_codes_remaining: number
  last_verified_at?: string
  enrollment_available: boolean
  enrollment_blocked_reason?: string
}

/**
 * The caller, as described to itself by `GET /account/info`.
 *
 * `mutable` is the server's answer to "may this credential change its own
 * password", so the UI disables a control rather than offering a request that is
 * guaranteed to fail. A root identity reports `false`: its secret comes from the
 * server environment and also derives the internode RPC secret, so it cannot be
 * rotated at runtime.
 */
export interface AccountInfo {
  access_key: string
  identity_type: IdentityType
  session_access_key?: string
  is_admin: boolean
  status: string
  member_of: string[]
  policies: string[]
  credentials_source: CredentialsSource
  mutable: AccountMutability
  mfa: AccountMfaSummary
}

export interface RecoveryCodes {
  recovery_codes: string[]
  generated_at: string
}

export interface ChangePasswordResult {
  sessions_revoked: number
}

/**
 * Access to the self-service account and MFA endpoints.
 *
 * Every call targets the caller's own identity; none of them take a target, so
 * this hook cannot be used to act on another account. Administrative resets live
 * in the user-management surface instead.
 */
export function useAccount() {
  const api = useApiOptional()

  const getAccountInfo = useCallback(async (): Promise<AccountInfo | null> => {
    if (!api) return null
    // Suppressed so a server without these endpoints surfaces as a caught error
    // the caller can degrade on, instead of bouncing the user to /403.
    return (await api.get("/account/info", { suppress403Redirect: true })) as AccountInfo
  }, [api])

  const changePassword = useCallback(
    async (currentSecretKey: string, newSecretKey: string): Promise<ChangePasswordResult | null> => {
      if (!api) return null
      return (await api.post(
        "/account/password",
        { current_secret_key: currentSecretKey, new_secret_key: newSecretKey },
        { suppress403Redirect: true },
      )) as ChangePasswordResult
    },
    [api],
  )

  const getMfaStatus = useCallback(async (): Promise<MfaStatus | null> => {
    if (!api) return null
    return (await api.get("/account/mfa", { suppress403Redirect: true })) as MfaStatus
  }, [api])

  const enrollMfa = useCallback(async (): Promise<MfaEnrollment | null> => {
    if (!api) return null
    return (await api.post("/account/mfa/enroll", {}, { suppress403Redirect: true })) as MfaEnrollment
  }, [api])

  const activateMfa = useCallback(
    async (code: string): Promise<RecoveryCodes | null> => {
      if (!api) return null
      return (await api.post("/account/mfa/activate", { code }, { suppress403Redirect: true })) as RecoveryCodes
    },
    [api],
  )

  const disableMfa = useCallback(
    async (code: string, currentSecretKey: string): Promise<void> => {
      if (!api) return
      // Both factors: the code proves possession of the authenticator, the
      // secret key proves the person removing the protection is the account
      // owner and not a hijacked session.
      await api.post(
        "/account/mfa/disable",
        { code, current_secret_key: currentSecretKey },
        { suppress403Redirect: true },
      )
    },
    [api],
  )

  const regenerateRecoveryCodes = useCallback(
    async (code: string): Promise<RecoveryCodes | null> => {
      if (!api) return null
      return (await api.post("/account/mfa/recovery-codes", { code }, { suppress403Redirect: true })) as RecoveryCodes
    },
    [api],
  )

  const getMfaChallenge = useCallback(async (): Promise<MfaChallenge | null> => {
    if (!api) return null
    return (await api.get("/mfa/challenge", { suppress403Redirect: true })) as MfaChallenge
  }, [api])

  return {
    getAccountInfo,
    changePassword,
    getMfaStatus,
    enrollMfa,
    activateMfa,
    disableMfa,
    regenerateRecoveryCodes,
    getMfaChallenge,
  }
}
