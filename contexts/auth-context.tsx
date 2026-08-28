"use client"

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react"
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types"
import type { SiteConfig } from "@/types/config"
import { getLoginRoute } from "@/lib/routes"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { buildOidcLogoutUrl, type OidcLogoutSession } from "@/lib/oidc"
import { isMfaRequiredError } from "@/lib/mfa"
import { fetchMfaChallenge } from "@/lib/mfa-challenge"

interface Credentials {
  AccessKeyId?: string
  SecretAccessKey?: string
  SessionToken?: string
  Expiration?: string
}

/**
 * Result of a first login attempt.
 *
 * A demand for a second factor is an expected branch of a successful password
 * check, not an error, so it is modelled as an outcome rather than thrown. The
 * long-term credentials stay in the caller's state for the second call and are
 * never persisted.
 */
export type LoginOutcome = { status: "authenticated" } | { status: "mfa-required"; challenge?: string }

interface AuthContextValue {
  login: (
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
    customConfig?: SiteConfig,
  ) => Promise<LoginOutcome>
  completeLoginWithSecondFactor: (
    credentials: AwsCredentialIdentity,
    secondFactor: { code: string; challenge?: string },
    customConfig?: SiteConfig,
  ) => Promise<void>
  loginWithStsCredentials: (credentials: Credentials, oidcSession?: OidcLogoutSession) => Promise<void>
  logout: () => void
  logoutAndRedirect: () => void
  logoutWithOidcRedirect: () => Promise<boolean>
  setIsAdmin: (value: boolean) => void
  getIsAdmin: () => boolean
  credentials: Credentials | undefined
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isValidCredentials(credentials: Credentials | undefined): boolean {
  if (
    !credentials?.AccessKeyId ||
    !credentials?.SecretAccessKey ||
    !credentials?.SessionToken ||
    !credentials?.Expiration
  ) {
    return false
  }
  const isExpired = (exp: string) => (exp ? new Date(exp) < new Date() : false)
  return !isExpired(credentials.Expiration)
}

/**
 * Whether these credentials are a static key pair we can sign a probe with.
 *
 * A `AwsCredentialIdentityProvider` is a function; resolving it here to read the
 * secret would duplicate what the SDK does during signing, so those callers skip
 * the probe and rely on AssumeRole's error instead.
 */
function isStaticCredentials(
  credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
): credentials is AwsCredentialIdentity {
  return typeof credentials !== "function" && typeof credentials?.accessKeyId === "string"
}

function isValidOidcLogoutSession(session: OidcLogoutSession | undefined): session is OidcLogoutSession {
  return typeof session?.logoutToken === "string" && session.logoutToken.trim().length > 0
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useLocalStorage<Credentials | undefined>("auth.credentials", undefined)
  const [isAdminStore, setIsAdminStore] = useLocalStorage<boolean | undefined>("auth.isAdmin", undefined)
  const [oidcSessionStore, setOidcSessionStore] = useLocalStorage<OidcLogoutSession | undefined>(
    "auth.oidcSession",
    undefined,
  )

  const setCredentials = useCallback(
    (credentials: Credentials) => {
      setStore(credentials)
    },
    [setStore],
  )

  const getCredentials = useCallback(() => {
    if (!isValidCredentials(store)) return undefined
    return store
  }, [store])

  const setIsAdmin = useCallback(
    (value: boolean) => {
      setIsAdminStore(value)
    },
    [setIsAdminStore],
  )

  const setOidcSession = useCallback(
    (session: OidcLogoutSession | undefined) => {
      setOidcSessionStore(isValidOidcLogoutSession(session) ? session : undefined)
    },
    [setOidcSessionStore],
  )

  const getIsAdmin = useCallback(() => {
    return !!isAdminStore
  }, [isAdminStore])

  const resolveConfig = useCallback(async (customConfig?: SiteConfig) => {
    if (customConfig) return customConfig
    const { configManager } = await import("@/lib/config")
    return configManager.loadConfig()
  }, [])

  const storeStsCredentials = useCallback(
    (credentialsResponse: {
      AccessKeyId?: string
      SecretAccessKey?: string
      SessionToken?: string
      Expiration?: Date
    }) => {
      setCredentials({
        AccessKeyId: credentialsResponse.AccessKeyId,
        SecretAccessKey: credentialsResponse.SecretAccessKey,
        SessionToken: credentialsResponse.SessionToken,
        Expiration: credentialsResponse.Expiration?.toISOString(),
      })
      setOidcSession(undefined)
    },
    [setCredentials, setOidcSession],
  )

  const login = useCallback(
    async (
      credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
      customConfig?: SiteConfig,
    ): Promise<LoginOutcome> => {
      const config = await resolveConfig(customConfig)
      const { getStsToken } = await import("@/lib/sts")

      // Ask before attempting, when the credentials are a static pair we can
      // sign with. A credential *provider* cannot be probed this way, so those
      // fall through to the AssumeRole error below.
      const staticCredentials = isStaticCredentials(credentials) ? credentials : undefined
      if (staticCredentials) {
        const challenge = await fetchMfaChallenge(
          {
            accessKeyId: staticCredentials.accessKeyId,
            secretAccessKey: staticCredentials.secretAccessKey,
          },
          config,
        )
        if (challenge.required) {
          return { status: "mfa-required", challenge: challenge.challenge }
        }
      }

      try {
        storeStsCredentials(await getStsToken(credentials, "arn:aws:iam::*:role/Admin", config))
        return { status: "authenticated" }
      } catch (error) {
        // Backstop for the cases the probe could not cover: a credential
        // provider, or a server that has no challenge endpoint but does enforce
        // the factor. AssumeRole fails closed and says so.
        if (isMfaRequiredError(error)) {
          return { status: "mfa-required" }
        }
        throw error
      }
    },
    [resolveConfig, storeStsCredentials],
  )

  const completeLoginWithSecondFactor = useCallback(
    async (
      credentials: AwsCredentialIdentity,
      secondFactor: { code: string; challenge?: string },
      customConfig?: SiteConfig,
    ) => {
      const config = await resolveConfig(customConfig)
      const { getStsToken } = await import("@/lib/sts")

      storeStsCredentials(await getStsToken(credentials, "arn:aws:iam::*:role/Admin", config, secondFactor))
    },
    [resolveConfig, storeStsCredentials],
  )

  const loginWithStsCredentials = useCallback(
    async (creds: Credentials, oidcSession?: OidcLogoutSession) => {
      setCredentials({
        AccessKeyId: creds.AccessKeyId,
        SecretAccessKey: creds.SecretAccessKey,
        SessionToken: creds.SessionToken,
        Expiration: creds.Expiration,
      })
      setOidcSession(oidcSession)
    },
    [setCredentials, setOidcSession],
  )

  const logout = useCallback(() => {
    setStore(undefined)
    setIsAdminStore(undefined)
    setOidcSessionStore(undefined)
  }, [setStore, setIsAdminStore, setOidcSessionStore])

  const logoutAndRedirect = useCallback(() => {
    logout()
    window.location.href = getLoginRoute()
  }, [logout])

  const logoutWithOidcRedirect = useCallback(async () => {
    const oidcSession = isValidOidcLogoutSession(oidcSessionStore) ? oidcSessionStore : undefined

    if (!oidcSession) {
      logout()
      return false
    }

    try {
      // Build the URL before logout(), or DashboardAuthGuard redirects to login before this navigation runs.
      const { configManager } = await import("@/lib/config")
      const config = await configManager.loadConfig()
      const logoutUrl = buildOidcLogoutUrl(config.serverHost, oidcSession.logoutToken)

      logout()
      window.location.href = logoutUrl
      return true
    } catch {
      logout()
      return false
    }
  }, [oidcSessionStore, logout])

  const credentials = getCredentials()
  const isAuthenticated = isValidCredentials(store)

  const value = useMemo<AuthContextValue>(
    () => ({
      login,
      completeLoginWithSecondFactor,
      loginWithStsCredentials,
      logout,
      logoutAndRedirect,
      logoutWithOidcRedirect,
      setIsAdmin,
      getIsAdmin,
      credentials,
      isAuthenticated,
      isAdmin: !!isAdminStore,
    }),
    [
      login,
      completeLoginWithSecondFactor,
      loginWithStsCredentials,
      logout,
      logoutAndRedirect,
      logoutWithOidcRedirect,
      setIsAdmin,
      getIsAdmin,
      credentials,
      isAuthenticated,
      isAdminStore,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
