import { ListObjectsV2Command, type S3Client } from "@aws-sdk/client-s3"
import { summarizePrefix } from "./prefix-summary"

export function fetchPrefixSummary(client: S3Client, bucket: string, prefix: string, signal: AbortSignal) {
  return summarizePrefix(
    (token, abortSignal) =>
      client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: token,
          EncodingType: "url",
        }),
        { abortSignal },
      ),
    signal,
  )
}
