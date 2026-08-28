import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts"
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types"
import { addApiPrefixMiddleware } from "@/lib/api-prefix-middleware"
import type { SiteConfig } from "@/types/config"

/**
 * Second factor to present alongside the credentials.
 *
 * Carried on `AssumeRole`'s own `SerialNumber`/`TokenCode` fields rather than a
 * custom endpoint: they are part of the STS API, so the AWS SDK sends them
 * unchanged and a script using `aws sts assume-role` can authenticate the same
 * way the console does.
 */
export interface StsSecondFactor {
  /** The challenge from `GET /mfa/challenge`, echoed back. */
  challenge?: string
  /** A six-digit TOTP code or a recovery code. */
  code: string
}

export async function getStsToken(
  credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
  roleArn: string,
  customConfig: SiteConfig,
  secondFactor?: StsSecondFactor,
) {
  const stsClient = new STSClient({
    endpoint: customConfig.s3.endpoint,
    region: customConfig.s3.region || "us-east-1",
    credentials: credentials,
  })

  addApiPrefixMiddleware(stsClient)

  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: "console",
    DurationSeconds: customConfig.session?.durationSeconds || 3600 * 12,
    ...(secondFactor
      ? {
          SerialNumber: secondFactor.challenge,
          TokenCode: secondFactor.code,
        }
      : {}),
  })

  const response = await stsClient.send(command)

  if (!response.Credentials) {
    throw new Error("Failed to retrieve credentials")
  }

  return response.Credentials
}
