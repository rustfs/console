import { ListBucketsCommand, type Bucket, type ListBucketsCommandOutput } from "@aws-sdk/client-s3"

export async function listAllBuckets(
  send: (command: ListBucketsCommand) => Promise<ListBucketsCommandOutput>,
): Promise<ListBucketsCommandOutput> {
  const buckets = new Map<string, Bucket>()
  const tokens = new Set<string>()
  const fetchPage = (token?: string) => send(new ListBucketsCommand({ MaxBuckets: 1000, ContinuationToken: token }))
  let page = await fetchPage()
  const firstPage = page

  for (;;) {
    for (const bucket of page.Buckets ?? []) {
      if (bucket.Name) buckets.set(bucket.Name, bucket)
    }
    const next = page.ContinuationToken
    if (!next) return { ...firstPage, Buckets: [...buckets.values()], ContinuationToken: undefined }
    if (tokens.has(next)) throw new Error("ListBuckets returned a repeated continuation token")
    tokens.add(next)
    page = await fetchPage(next)
  }
}
