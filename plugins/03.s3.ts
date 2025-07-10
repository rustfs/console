import { S3Client } from "@aws-sdk/client-s3";
import type { SiteConfig } from "~/types/config";
import type { DeserializeHandler, DeserializeHandlerArguments, DeserializeHandlerOutput } from "@aws-sdk/types";

interface S3Response {
  response?: {
    body?: string;
  };
  [key: string]: any;
}

export default defineNuxtPlugin({
  name: "s3-client",
  setup(nuxtApp) {
    const { credentials, isAuthenticated } = useAuth();
    const siteConfig = nuxtApp.$siteConfig as SiteConfig;

    if (!isAuthenticated || !credentials.value) {
      return;
    }

    const client = new S3Client({
      endpoint: siteConfig.s3.endpoint + (process.env.BASE_URL || "/rustfs/console/"),
      region: siteConfig.s3.region || "us-east-1",
      forcePathStyle: true,
      // https://github.com/aws/aws-sdk-js-v3/issues/6834#issuecomment-2611346849
      requestChecksumCalculation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: credentials.value?.AccessKeyId || "",
        secretAccessKey: credentials.value?.SecretAccessKey || "",
        sessionToken: credentials.value?.SessionToken || "",
      },
    });

    // 添加中间件处理XML响应和401错误
    client.middlewareStack.add(
      (next: DeserializeHandler<any, any>) =>
        async (args: DeserializeHandlerArguments<any>): Promise<DeserializeHandlerOutput<any>> => {
          try {
            const response = (await next(args)) as S3Response;

            // 检查响应是否为XML格式
            if (response.response?.body && typeof response.response.body === "string") {
              const body = response.response.body.trim();

              // 检查是否是空的XML响应
              if (body.match(/^<\?xml[^>]*\?><[^>]*><\/[^>]*>$/)) {
                // 从XML标签名提取属性名
                const tagName = body.match(/<([^>]*)><\/\1>/)?.[1];
                if (tagName) {
                  // 将XML标签名转换为驼峰命名
                  const propertyName = tagName.replace(/(?:^|_)([a-z])/g, (_, letter) => letter.toUpperCase());
                  // 返回null，保持response结构
                  return {
                    response: response.response,
                    [propertyName]: null,
                  } as unknown as DeserializeHandlerOutput<any>;
                }
              }
            }

            return response as DeserializeHandlerOutput<any>;
          } catch (error: any) {
            if (error?.$metadata?.httpStatusCode === 401) {
              await useAuth().logoutAndRedirect();
            }

            // 处理 S3 客户端错误，优先抛出 error.message 作为新的 Error
            if (error?.Code) {
              throw new Error(error.Code);
            }
            throw error;
          }
        },
      {
        step: "deserialize",
        name: "handleXmlResponse",
      }
    );

    return {
      provide: {
        s3Client: client,
      },
    };
  },
});
