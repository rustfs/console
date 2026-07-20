export const TIER_PROVIDERS = [
  { labelKey: "Wasabi", value: "wasabi", icon: "/svg/wasabi.svg", descKey: "Wasabi hot cloud storage" },
  { labelKey: "RustFS", value: "rustfs", icon: "/logo.svg", descKey: "RustFS built-in cold storage" },
  { labelKey: "MinIO", value: "minio", icon: "/svg/minio.svg", descKey: "External MinIO tier" },
  { labelKey: "AWS S3", value: "s3", icon: "/svg/aws.svg", descKey: "Standard AWS S3 tier" },
  {
    labelKey: "Alibaba Cloud",
    value: "aliyun",
    icon: "/svg/aliyun.svg",
    descKey: "Alibaba Cloud Object Storage Service",
  },
  { labelKey: "Azure Blob", value: "azure", icon: "/svg/azure.svg", descKey: "Microsoft Azure Blob Storage" },
  { labelKey: "Google Cloud Storage", value: "gcs", icon: "/svg/google.svg", descKey: "Google Cloud Storage" },
  { labelKey: "Cloudflare R2", value: "r2", icon: "/svg/cloudflare.svg", descKey: "Cloudflare R2 Storage" },
] as const

export type TierProviderType = (typeof TIER_PROVIDERS)[number]["value"]

export interface TierFormValues {
  name: string
  endpoint: string
  accessKey: string
  secretKey: string
  creds: string
  bucket: string
  prefix: string
  region: string
  storageClass: string
}

export const WASABI_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-central-1",
  "us-west-1",
  "us-west-2",
  "ca-central-1",
  "eu-central-1",
  "eu-central-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-south-1",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-southeast-1",
  "ap-southeast-2",
] as const

export function normalizeWasabiRegion(region: string): string {
  return region.trim().toLowerCase()
}

export function getWasabiEndpoint(region: string): string {
  const normalizedRegion = normalizeWasabiRegion(region)
  if (!normalizedRegion) return ""
  if (normalizedRegion === "us-east-1") return "https://s3.wasabisys.com"
  return `https://s3.${normalizedRegion}.wasabisys.com`
}

export function buildTierPayload(type: TierProviderType, values: TierFormValues) {
  if (type === "wasabi") {
    return {
      type,
      wasabi: {
        name: values.name,
        region: normalizeWasabiRegion(values.region),
        accessKey: values.accessKey,
        secretKey: values.secretKey,
        bucket: values.bucket,
        prefix: values.prefix,
      },
    }
  }

  const config: Record<string, unknown> = {
    name: values.name,
    endpoint: values.endpoint,
    bucket: values.bucket,
    prefix: values.prefix,
    region: values.region,
    storageClass: values.storageClass,
  }
  if (type === "gcs") {
    config.creds = values.creds
  } else {
    config.accessKey = values.accessKey
    config.secretKey = values.secretKey
  }
  return { type, [type]: config }
}
