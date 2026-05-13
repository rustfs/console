export type BucketModuleRoute = "/events" | "/lifecycle" | "/replication"

export function buildModuleBucketPath(route: BucketModuleRoute, bucketName: string): string {
  if (!bucketName) return route

  const params = new URLSearchParams({ bucket: bucketName })
  return `${route}?${params.toString()}`
}
