export type S3Config = {
  region: string
  endpoint: string
  accessKeyId?: string
  secretAccessKey?: string
}

export type ApiConfig = {
  baseURL: string
}

export type SessionConfig = {
  durationSeconds: number
}

export type Release = {
  version: string
  date: string
}

export type OidcProvider = {
  provider_id: string
  display_name: string
}

export interface SiteConfig {
  serverHost: string
  api: ApiConfig
  s3: S3Config
  session?: SessionConfig
  release?: Release
  oidc?: OidcProvider[]
}
