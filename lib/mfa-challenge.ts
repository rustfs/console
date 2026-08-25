import { joinURL } from "ufo"
import { AwsClient } from "@/lib/aws4fetch"
import type { MfaChallenge } from "@/lib/mfa"
import type { SiteConfig } from "@/types/config"

/**
 * Ask the server whether an identity needs a second factor, before any session
 * exists.
 *
 * This runs at login time, so it cannot go through `ApiProvider`: that client is
 * built from STS credentials the user does not have yet. It signs with the
 * long-term access key the user just typed, which is also what keeps the
 * endpoint from being an enumeration oracle — a caller only ever learns about
 * the identity whose secret it already holds.
 *
 * A server that predates this endpoint answers 404 or 501. That is reported as
 * "no second factor required" rather than as a failure, so the console keeps
 * working against an older cluster.
 */
export async function fetchMfaChallenge(
  credentials: { accessKeyId: string; secretAccessKey: string },
  config: SiteConfig,
): Promise<MfaChallenge> {
  const client = new AwsClient({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    region: config.s3.region || "us-east-1",
    service: "s3",
  })

  const url = joinURL(config.api.baseURL, "/mfa/challenge")

  let response: Response
  try {
    response = await client.fetch(url, { method: "GET" })
  } catch {
    // A transport failure here must not silently skip the second factor: fall
    // through to `AssumeRole`, which fails closed on its own if a factor is
    // enrolled. Returning `required: false` only means "we could not ask".
    return { required: false }
  }

  if (response.status === 404 || response.status === 501) {
    return { required: false }
  }

  if (!response.ok) {
    // Wrong credentials land here as a 403. Let AssumeRole produce the
    // authoritative error rather than inventing one from this probe.
    return { required: false }
  }

  try {
    return (await response.json()) as MfaChallenge
  } catch {
    return { required: false }
  }
}
