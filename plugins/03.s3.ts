import { S3Client } from "@aws-sdk/client-s3";
import type { SiteConfig } from "~/types/config";

export default defineNuxtPlugin({
  name: 's3-client',
  setup(nuxtApp) {
    const { credentials, isAuthenticated } = useAuth();
    const siteConfig = nuxtApp.$siteConfig as SiteConfig;

    if (!isAuthenticated || !credentials.value) {
      return;
    }


    const client = new S3Client({
      endpoint: siteConfig.s3.endpoint,
      region: siteConfig.s3.region || 'us-east-1',
      forcePathStyle: true,
      // https://github.com/aws/aws-sdk-js-v3/issues/6834#issuecomment-2611346849
      requestChecksumCalculation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: credentials.value?.AccessKeyId || '',
        secretAccessKey: credentials.value?.SecretAccessKey || '',
        sessionToken: credentials.value?.SessionToken || '',
      }
    });

    // 添加中间件捕捉 401 错误
    client.middlewareStack.add(
      (next, context) => async (args) => {
        try {
          return await next(args);
        } catch (error: any) {
          if (error?.$metadata?.httpStatusCode === 401) {
            await useAuth().logoutAndRedirect();
          }
          // 其他错误处理
          console.error('S3Client error:', error);
          throw error;
        }
      },
      {
        step: "finalizeRequest",
        name: "handleUnauthorizedMiddleware",
      }
    );

    return {
      provide: {
        s3Client: client
      }
    }
  }
})
