import { S3Client } from "@aws-sdk/client-s3";

export default defineNuxtPlugin((nuxtApp) => {
  const { credentials, isAuthenticated } = useAuth();
  const runtimeConfig = useRuntimeConfig().public;

  if (!isAuthenticated || !credentials.value) {
    return
  }

  const client = new S3Client({
    endpoint: runtimeConfig.s3.endpoint,
    region: runtimeConfig.s3.region || 'us-east-1',
    credentials: {
      accessKeyId: credentials.value?.AccessKeyId || '',
      secretAccessKey: credentials.value?.SecretAccessKey || '',
      sessionToken: credentials.value?.SessionToken || '',
    }
  });

  // Expose to useNuxtApp().$api, useNuxtApp().$apiFetch
  return {
    provide: {
      s3Client: client
    }
  }
})
