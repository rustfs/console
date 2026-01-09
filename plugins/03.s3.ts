import { S3Client } from '@aws-sdk/client-s3'
import type { DeserializeHandler, DeserializeHandlerArguments, DeserializeHandlerOutput } from '@aws-sdk/types'
import type { SiteConfig } from '~/types/config'

interface S3Response {
  response?: {
    body?: string
  }
  [key: string]: any
}

export default defineNuxtPlugin({
  name: 's3-client',
  setup(nuxtApp) {
    const { credentials, isAuthenticated } = useAuth()
    const siteConfig = nuxtApp.$siteConfig as SiteConfig

    if (!isAuthenticated || !credentials.value) {
      return
    }

    const client = new S3Client({
      endpoint: siteConfig.s3.endpoint,
      region: siteConfig.s3.region || 'us-east-1',
      forcePathStyle: true,
      // https://github.com/aws/aws-sdk-js-v3/issues/6834#issuecomment-2611346849
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: credentials.value?.AccessKeyId || '',
        secretAccessKey: credentials.value?.SecretAccessKey || '',
        sessionToken: credentials.value?.SessionToken || '',
      },
    })

    // Add middleware to handle XML responses and 401 errors
    client.middlewareStack.add(
      (next: DeserializeHandler<any, any>) =>
        async (args: DeserializeHandlerArguments<any>): Promise<DeserializeHandlerOutput<any>> => {
          try {
            const response = (await next(args)) as S3Response

            // Check if response is XML format
            if (response.response?.body && typeof response.response.body === 'string') {
              const body = response.response.body.trim()

              // Check if it's an empty XML response
              if (body.match(/^<\?xml[^>]*\?><[^>]*><\/[^>]*>$/)) {
                // Extract property name from XML tag name
                const tagName = body.match(/<([^>]*)><\/\1>/)?.[1]
                if (tagName) {
                  // Convert XML tag name to camelCase
                  const propertyName = tagName.replace(/(?:^|_)([a-z])/g, (_, letter) => letter.toUpperCase())
                  // Return null, maintain response structure
                  return {
                    response: response.response,
                    [propertyName]: null,
                  } as unknown as DeserializeHandlerOutput<any>
                }
              }
            }

            return response as DeserializeHandlerOutput<any>
          } catch (error: any) {
            // Handle 401 Unauthorized error
            if (error?.$metadata?.httpStatusCode === 401) {
              // Notice the logout and redirect
              const { t } = useI18n()
              const message = useMessage()
              message.error(t('Your session has expired. Please log in again.'))
              const { logout } = useAuth()
              logout()
              // Use navigateTo instead of directly manipulating window.location
              await navigateTo('/auth/login')
              // Return an empty response to meet type requirements
              return {
                response: {
                  statusCode: 401,
                  headers: {},
                },
              } as DeserializeHandlerOutput<any>
            }

            // Handle S3 client errors, prioritize throwing error.message as new Error
            if (error?.Code) {
              throw new Error(error.Code)
            }
            throw error
          }
        },
      {
        step: 'deserialize',
        name: 'handleXmlResponse',
      }
    )

    return {
      provide: {
        s3Client: client,
      },
    }
  },
})
