import ApiClient from '~/lib/api-client'
import { AwsClient } from '~/lib/aws4fetch'
import { ApiErrorHandler } from '~/lib/utils/api-error-handler'
import type { SiteConfig } from '~/types/config'
import { navigateToRoute } from '~/utils/routes'

export default defineNuxtPlugin({
  name: 'admin-api-client',
  setup(nuxtApp) {
    const siteConfig = nuxtApp.$siteConfig as SiteConfig
    const { isAuthenticated, credentials } = useAuth()

    if (!isAuthenticated.value) {
      return
    }

    const accessKeyId = credentials.value?.AccessKeyId || ''
    const secretAccessKey = credentials.value?.SecretAccessKey || ''
    const sessionToken = credentials.value?.SessionToken || ''
    const region: string = siteConfig.s3.region || 'us-east-1'
    const service = 's3'

    const adminApiClient: AwsClient = new AwsClient({
      accessKeyId,
      secretAccessKey,
      sessionToken,
      region,
      service,
    })

    // Create error handler
    const errorHandler = new ApiErrorHandler({
      onUnauthorized: async () => {
        const { logout } = useAuth()
        logout()
        await navigateToRoute('/auth/login', { external: true })
      },
    })

    const apiClient = new ApiClient(adminApiClient, {
      baseUrl: siteConfig.api.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      errorHandler,
    })

    return {
      provide: {
        api: apiClient,
      },
    }
  },
})
