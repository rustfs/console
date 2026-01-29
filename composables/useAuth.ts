import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { getStsToken } from '~/lib/sts'
import type { SiteConfig } from '~/types/config'
import { getLoginRoute } from '~/utils/routes'

interface Credentials {
  AccessKeyId?: string
  SecretAccessKey?: string
  SessionToken?: string
  Expiration?: string
}

export function useAuth() {
  const store = useLocalStorage('auth.credentials', {})
  const isAdminStore = useLocalStorage('auth.isAdmin', false)
  const permanentStore = useLocalStorage<Credentials | undefined>('auth.permanent', undefined)

  const setCredentials = (credentials: Credentials) => {
    store.value = credentials
  }

  const setPermanentCredentials = (credentials: Credentials) => {
    permanentStore.value = credentials
  }

  const getCredentials = () => {
    if (!isValidCredentials(store.value)) {
      return
    }

    return store.value
  }

  const getPermanentCredentials = () => {
    return permanentStore.value
  }

  const setIsAdmin = (value: boolean) => {
    isAdminStore.value = value
  }

  const getIsAdmin = () => {
    return isAdminStore.value
  }

  const isExpired = (expiration: string) => (expiration ? new Date(expiration) < new Date() : false)

  const isValidCredentials = (credentials: Credentials) => {
    return (
      !!credentials?.AccessKeyId &&
      !!credentials?.SecretAccessKey &&
      !!credentials?.SessionToken &&
      credentials?.Expiration &&
      !isExpired(credentials.Expiration)
    )
  }

  const login = async (
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
    customConfig?: SiteConfig
  ) => {
    const credentialsResponse = await getStsToken(credentials, 'arn:aws:iam::*:role/Admin', customConfig)

    setCredentials({
      ...credentialsResponse,
      Expiration: credentialsResponse.Expiration?.toISOString(),
    })

    // If it's not an STS login (i.e., no SessionToken), save it as permanent credentials.
    // Or if it's an STS login but without a SessionToken (theoretically shouldn't happen).
    // In reality, AwsCredentialIdentity might contain a SessionToken.
    // We only save it when explicitly logging in with AccessKey/SecretKey (usually no SessionToken, or user intent is clear).
    // Simple check here: if no SessionToken, or STS login with very long expiration?
    // Usually STS login has a SessionToken.
    // Note: The passed credentials parameter can be a function (IdentityProvider) or an object.
    // If it's an object and has no SessionToken, we consider it permanent credentials.
    if (typeof credentials === 'object' && !('sessionToken' in credentials && credentials.sessionToken)) {
      setPermanentCredentials({
        AccessKeyId: credentials.accessKeyId,
        SecretAccessKey: credentials.secretAccessKey,
      })
    } else {
      // Clear old permanent credentials to avoid confusion
      permanentStore.value = undefined
    }

    return credentialsResponse
  }

  const logout = () => {
    store.value = {}
    permanentStore.value = undefined
    isAdminStore.value = false
  }

  const logoutAndRedirect = () => {
    logout()
    window.location.href = getLoginRoute()
  }

  return {
    login,
    logout,
    logoutAndRedirect,
    setIsAdmin,
    getIsAdmin,
    credentials: ref<Credentials | undefined>(getCredentials()),
    permanentCredentials: ref<Credentials | undefined>(getPermanentCredentials()),
    isAuthenticated: computed(() => isValidCredentials(store.value)),
    isAdmin: computed(() => isAdminStore.value),
  }
}
