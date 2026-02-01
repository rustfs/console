"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types"
import { getStsToken } from "@/lib/sts"
import type { SiteConfig } from "@/types/config"
import { getLoginRoute } from "@/lib/routes"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface Credentials {
  AccessKeyId?: string
  SecretAccessKey?: string
  SessionToken?: string
  Expiration?: string
}

interface AuthContextValue {
  login: (
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
    customConfig?: SiteConfig
  ) => Promise<unknown>
  logout: () => void
  logoutAndRedirect: () => void
  setIsAdmin: (value: boolean) => void
  getIsAdmin: () => boolean
  credentials: Credentials | undefined
  permanentCredentials: Credentials | undefined
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isValidCredentials(credentials: Credentials): boolean {
  if (
    !credentials?.AccessKeyId ||
    !credentials?.SecretAccessKey ||
    !credentials?.SessionToken ||
    !credentials?.Expiration
  ) {
    return false
  }
  const isExpired = (exp: string) =>
    exp ? new Date(exp) < new Date() : false
  return !isExpired(credentials.Expiration)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useLocalStorage<Credentials>("auth.credentials", {})
  const [isAdminStore, setIsAdminStore] = useLocalStorage<boolean>(
    "auth.isAdmin",
    false
  )
  const [permanentStore, setPermanentStore] = useLocalStorage<
    Credentials | undefined
  >("auth.permanent", undefined)

  const setCredentials = useCallback((credentials: Credentials) => {
    setStore(credentials)
  }, [setStore])

  const setPermanentCredentials = useCallback(
    (credentials: Credentials) => {
      setPermanentStore(credentials)
    },
    [setPermanentStore]
  )

  const getCredentials = useCallback(() => {
    if (!isValidCredentials(store)) return undefined
    return store
  }, [store])

  const setIsAdmin = useCallback(
    (value: boolean) => {
      setIsAdminStore(value)
    },
    [setIsAdminStore]
  )

  const getIsAdmin = useCallback(() => {
    return isAdminStore
  }, [isAdminStore])

  const login = useCallback(
    async (
      credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
      customConfig?: SiteConfig
    ) => {
      if (!customConfig) {
        const { configManager } = await import("@/lib/config")
        customConfig = await configManager.loadConfig()
      }

      const credentialsResponse = await getStsToken(
        credentials,
        "arn:aws:iam::*:role/Admin",
        customConfig
      )

      setCredentials({
        ...credentialsResponse,
        AccessKeyId: credentialsResponse.AccessKeyId,
        SecretAccessKey: credentialsResponse.SecretAccessKey,
        SessionToken: credentialsResponse.SessionToken,
        Expiration: credentialsResponse.Expiration?.toISOString(),
      })

      if (
        typeof credentials === "object" &&
        !("sessionToken" in credentials && credentials.sessionToken)
      ) {
        setPermanentCredentials({
          AccessKeyId: credentials.accessKeyId,
          SecretAccessKey: credentials.secretAccessKey,
        })
      } else {
        setPermanentStore(undefined)
      }

      return credentialsResponse
    },
    [
      setCredentials,
      setPermanentCredentials,
      setPermanentStore,
    ]
  )

  const logout = useCallback(() => {
    setStore({})
    setPermanentStore(undefined)
    setIsAdminStore(false)
  }, [setStore, setPermanentStore, setIsAdminStore])

  const logoutAndRedirect = useCallback(() => {
    logout()
    window.location.href = getLoginRoute()
  }, [logout])

  const credentials = getCredentials()
  const isAuthenticated = isValidCredentials(store)

  const value = useMemo<AuthContextValue>(
    () => ({
      login,
      logout,
      logoutAndRedirect,
      setIsAdmin,
      getIsAdmin,
      credentials,
      permanentCredentials: permanentStore,
      isAuthenticated,
      isAdmin: isAdminStore,
    }),
    [
      login,
      logout,
      logoutAndRedirect,
      credentials,
      permanentStore,
      isAuthenticated,
      isAdminStore,
    ]
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
