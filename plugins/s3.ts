import { S3Client } from "@aws-sdk/client-s3";

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig().public;
  console.log('S3 runtimeConfig', runtimeConfig);

  const client = new S3Client({
    endpoint: runtimeConfig.s3.endpoint,
    region: runtimeConfig.s3.region || 'us-east-1',
    credentials: {
      accessKeyId: runtimeConfig.s3.accessKeyId,
      secretAccessKey: runtimeConfig.s3.secretAccessKey,
      sessionToken: runtimeConfig.s3.sessionToken
    }
  });

  // Expose to useNuxtApp().$api, useNuxtApp().$apiFetch
  return {
    provide: {
      s3Client: client
    }
  }
})
