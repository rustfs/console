export function buildModuleBucketPath(route, bucketName) {
  if (!bucketName) return route

  const params = new URLSearchParams({ bucket: bucketName })
  return `${route}?${params.toString()}`
}
