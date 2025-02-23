export type S3Config = {
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export type ApiConfig = {
  baseURL: string;
}

export type ReleaseConfig = {
  version: string;
  date: string;
}

export type LicenseConfig = {
  name: string;
  url: string;
}

export type SessionConfig = {
  durationSeconds: number;
}

export interface SiteConfig {
  api: ApiConfig;
  s3: S3Config;
  release: ReleaseConfig;
  license: LicenseConfig;
  session?: SessionConfig;
}
