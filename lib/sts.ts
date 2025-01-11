import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types";

/**
 * 获取 STS 临时凭证并返回
 * @param {string} ak - 主账号 AccessKey
 * @param {string} sk - 主账号 SecretKey
 * @param {string} roleArn - 需要扮演的角色 ARN
 * @returns {Promise<Credentials>}
 */
export async function getStsToken(credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider, roleArn: string) {
  const runtimeConfig = useRuntimeConfig().public;
  console.log('S3 runtimeConfig', runtimeConfig);

  // 1. 创建 STS 客户端
  const stsClient = new STSClient({
    endpoint: runtimeConfig.s3.endpoint,
    region: runtimeConfig.s3.region || 'us-east-1',
    credentials: credentials
  });

  // 2. 构建 AssumeRole 请求
  //    你可以根据需要额外添加 DurationSeconds、Policy 等参数
  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: "console", // 自定义角色会话名称
    DurationSeconds: runtimeConfig.session.durationSeconds || 3600 * 12, // 临时凭证有效期
  });

  const response = await stsClient.send(command);

  if (!response.Credentials) {
    throw new Error("Failed to retrieve credentials");
  }

  return response.Credentials;
}
