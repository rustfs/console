import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { getStsToken } from "~/lib/sts";

interface Credentials {
  AccessKeyId?: string;
  SecretAccessKey?: string;
  SessionToken?: string;
  Expiration?: string;
}

export function useAuth() {
  const store = useLocalStorage('auth.credentials', {})

  const setCredentials = (credentials: Credentials) => {
    store.value = credentials
  }

  const getCredentials = () => {
    if (!isValiedCredentials(store.value)) {
      return
    }

    return store.value
  }

  const isExpired = (expiration: string) => expiration ? new Date(expiration) < new Date() : false

  const isValiedCredentials = (credentials: Credentials) => {
    return !!credentials?.AccessKeyId && !!credentials?.SecretAccessKey && !!credentials?.SessionToken && credentials?.Expiration && !isExpired(credentials.Expiration)
  }

  const login = async (credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider) => {
    const credentialsResponse = await getStsToken(credentials, 'arn:aws:iam::*:role/Admin')

    setCredentials({
      ...credentialsResponse,
      Expiration: credentialsResponse.Expiration?.toISOString()
    })

    return credentialsResponse
  }

  const logout = () => {
    store.value = {}
  }

  const logoutAndRedirect = () => {
    logout()
    window.location.href = '/auth/login'
  }

  return {
    login,
    logout,
    logoutAndRedirect,
    credentials: ref<Credentials | undefined>(getCredentials()),
    isAuthenticated: ref(isValiedCredentials(store.value)),
  }
}
