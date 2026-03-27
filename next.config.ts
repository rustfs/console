import type { NextConfig } from "next"

const defaultBasePath = process.env.NODE_ENV === "development" ? "" : "/rustfs/console"

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? defaultBasePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
