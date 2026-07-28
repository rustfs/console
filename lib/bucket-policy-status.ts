export interface BucketPolicyStatusResponse {
  PolicyStatus?: {
    IsPublic?: boolean
  }
}

export async function loadBucketPolicyStatuses(
  bucketNames: string[],
  getBucketPolicyStatus: (bucketName: string) => Promise<unknown>,
): Promise<Record<string, boolean | undefined>> {
  const results = await Promise.all(
    bucketNames.map(async (name) => {
      try {
        const response = (await getBucketPolicyStatus(name)) as BucketPolicyStatusResponse
        return [name, response.PolicyStatus?.IsPublic] as const
      } catch {
        return [name, undefined] as const
      }
    }),
  )

  return Object.fromEntries(results)
}
