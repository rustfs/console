import { AwsClient } from 'aws4fetch'
import ApiClient from '~/lib/api-client'

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig().public
  const { isAuthenticated, credentials } = useAuth()

  if (!isAuthenticated.value) {
    return
  }

  const accessKeyId = credentials.value?.AccessKeyId || ''
  const secretAccessKey = credentials.value?.SecretAccessKey || ''
  const sessionToken = credentials.value?.SessionToken || ''
  const region = runtimeConfig.s3.region || 'us-east-1'
  const service = 's3'

  const adminApiClient = new AwsClient({
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region,
    service
  })

  return {
    provide: {
      api: new ApiClient(adminApiClient, {
        baseUrl: runtimeConfig.api.baseURL,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
  }
})
