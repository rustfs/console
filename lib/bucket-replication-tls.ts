export type BucketReplicationTlsMode = "verify" | "custom-ca" | "skip"

export interface BucketReplicationTlsPayload {
  skipTlsVerify: boolean
  caCertPem: string
}

export function buildBucketReplicationTlsPayload(
  secure: boolean,
  mode: BucketReplicationTlsMode,
  caCertPem: string,
): BucketReplicationTlsPayload {
  if (!secure) {
    return { skipTlsVerify: false, caCertPem: "" }
  }

  if (mode === "skip") {
    return { skipTlsVerify: true, caCertPem: "" }
  }

  if (mode === "custom-ca") {
    return { skipTlsVerify: false, caCertPem: caCertPem.trim() }
  }

  return { skipTlsVerify: false, caCertPem: "" }
}
