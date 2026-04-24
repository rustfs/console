"use client"

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react"
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types"
import { getStsToken } from "@/lib/sts"
import type { SiteConfig } from "@/types/config"
import { getLoginRoute } from "@/lib/routes"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { buildOidcLogoutUrl, type OidcLogoutSession } from "@/lib/oidc"

interface Credentials {
  AccessKeyId?: string
  SecretAccessKey?: string
  SessionToken?: string
  Expiration?: string
}

interface AuthContextValue {
  login: (
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
    customConfig?: SiteConfig,
  ) => Promise<unknown>
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

  const login = useCallback(
    async (credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider, customConfig?: SiteConfig) => {
      if (!customConfig) {
        const { configManager } = await import("@/lib/config")
        customConfig = await configManager.loadConfig()
      }

      const credentialsResponse = await getStsToken(credentials, "arn:aws:iam::*:role/Admin", customConfig)

      setCredentials({
        ...credentialsResponse,
        AccessKeyId: credentialsResponse.AccessKeyId,
        SecretAccessKey: credentialsResponse.SecretAccessKey,
        SessionToken: credentialsResponse.SessionToken,
        Expiration: credentialsResponse.Expiration?.toISOString(),
      })
      setOidcSession(undefined)

      return credentialsResponse
    },
    [setCredentials, setOidcSession],
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
    logout()

    if (!oidcSession) return false

    try {
      const { configManager } = await import("@/lib/config")
      const config = await configManager.loadConfig()
      window.location.href = buildOidcLogoutUrl(config.serverHost, oidcSession.logoutToken)
      return true
    } catch {
      return false
    }
  }, [oidcSessionStore, logout])

  const credentials = getCredentials()
  const isAuthenticated = isValidCredentials(store)

  const value = useMemo<AuthContextValue>(
    () => ({
      login,
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
