import ApiClient from '~/lib/api-client';
import { AwsClient } from '~/lib/aws4fetch';
import type { SiteConfig } from '~/types/config'; // Updated import

export default defineNuxtPlugin({
  name: 'admin-api-client',
  setup(nuxtApp) {
    console.log('admin-api-client setup');

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
      service
    })

    return {
      provide: {
        api: new ApiClient(adminApiClient, {
          baseUrl: siteConfig.api.baseURL,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
    }
  }
})
