import { S3Client } from "@aws-sdk/client-s3";
import type { SiteConfig } from "~/types/config";

export default defineNuxtPlugin({
  name: 's3-client',
  setup(nuxtApp) {
    console.log('s3-client setup');
    const { credentials, isAuthenticated } = useAuth();
    const siteConfig = nuxtApp.$siteConfig as SiteConfig;

    if (!isAuthenticated || !credentials.value) {
      return;
    }

    console.log('s3-client setup', siteConfig);

    const client = new S3Client({
      endpoint: siteConfig.s3.endpoint,
      region: siteConfig.s3.region || 'us-east-1',
      // https://github.com/aws/aws-sdk-js-v3/issues/6834#issuecomment-2611346849
      requestChecksumCalculation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: credentials.value?.AccessKeyId || '',
        secretAccessKey: credentials.value?.SecretAccessKey || '',
        sessionToken: credentials.value?.SessionToken || '',
      }
    });

    return {
      provide: {
        s3Client: client
      }
    }
  }
})
