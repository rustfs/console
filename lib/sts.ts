import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts"
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types"
import type { SiteConfig } from "@/types/config"

export async function getStsToken(
  credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
  roleArn: string,
  customConfig: SiteConfig,
) {
  const stsClient = new STSClient({
    endpoint: customConfig.s3.endpoint,
    region: customConfig.s3.region || "us-east-1",
    credentials: credentials,
  })

  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: "console",
    DurationSeconds: customConfig.session?.durationSeconds || 3600 * 12,
  })

  const response = await stsClient.send(command)

  if (!response.Credentials) {
    throw new Error("Failed to retrieve credentials")
  }

  return response.Credentials
}
