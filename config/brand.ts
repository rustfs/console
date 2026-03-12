const brandId = process.env.NEXT_PUBLIC_BRAND_ID || "default"
const brandAssetDir = `/branding/${brandId}`

export const brand = {
  id: brandId,
  assetDir: brandAssetDir,
  companyName: process.env.NEXT_PUBLIC_BRAND_COMPANY || "RustFS",
  productName: process.env.NEXT_PUBLIC_BRAND_PRODUCT || "RustFS",
  title: process.env.NEXT_PUBLIC_BRAND_TITLE || process.env.NEXT_PUBLIC_BRAND_PRODUCT || "RustFS",
  description:
    process.env.NEXT_PUBLIC_BRAND_DESCRIPTION || "RustFS is a distributed file system written in Rust.",
  websiteUrl: process.env.NEXT_PUBLIC_BRAND_WEBSITE || "https://www.rustfs.com",
  docsUrl: process.env.NEXT_PUBLIC_BRAND_DOCS || "https://docs.rustfs.com",
  supportEmail: process.env.NEXT_PUBLIC_BRAND_SUPPORT_EMAIL || "hello@rustfs.com",
  defaultAdminLabel: process.env.NEXT_PUBLIC_BRAND_DEFAULT_ADMIN_LABEL || "rustfsAdmin",
  enterpriseLicenseKey: process.env.NEXT_PUBLIC_BRAND_LICENSE_KEY || "RUSTFS-ENTERPRISE-127-183",
  logoPath: `${brandAssetDir}/logo.svg`,
  avatarPath: `${brandAssetDir}/avatar.png`,
} as const
