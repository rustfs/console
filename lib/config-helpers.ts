import type { SiteConfig } from "@/types/config"
import { logger } from "./logger"

type ConfigSource = "browser" | "localStorage" | "server" | "default"

interface VersionConfigResponse {
  version?: string
  date?: string
  versionInfo?: string
}

export interface ConfigResult {
  config: SiteConfig | null
  source: ConfigSource
  error?: string
}

interface HostInfo {
  protocol: string
  host: string
  serverHost: string
}

const STORAGE_KEY = "rustfs-server-host"
const DEFAULT_REGION = "us-east-1"
const API_PATH = "/rustfs/admin/v3"
const VERSION_PATH = "/rustfs/console/version"
const REQUEST_TIMEOUT = 5000

const isBrowser = (): boolean => typeof window !== "undefined"

const getCurrentHostInfo = (): HostInfo | null => {
  if (!isBrowser()) return null

  const protocol = window.location.protocol.replace(":", "")
  const host = window.location.host
  const serverHost = `${protocol}://${host}`

  return { protocol, host, serverHost }
}

export const createDefaultConfig = (serverHost: string): SiteConfig => {
  return {
    serverHost,
    api: {
      baseURL: `${serverHost}${API_PATH}`,
    },
    s3: {
      endpoint: serverHost,
      region: DEFAULT_REGION,
      accessKeyId: "",
      secretAccessKey: "",
    },
  }
}

export const getStoredHostConfig = (): ConfigResult => {
  if (!isBrowser()) {
    return { config: null, source: "localStorage", error: "Not in browser environment" }
  }

  const savedHost = localStorage.getItem(STORAGE_KEY)
  if (!savedHost) {
    return { config: null, source: "localStorage", error: "No saved host found" }
  }

  try {
    const url = new URL(savedHost)
    const serverHost = `${url.protocol}//${url.host}`
    const config = createDefaultConfig(serverHost)
    return { config, source: "localStorage" }
  } catch (error) {
    const errorMessage = `Invalid saved host configuration: ${error instanceof Error ? error.message : "Unknown error"}`
    logger.warn(errorMessage)
    return { config: null, source: "localStorage", error: errorMessage }
  }
}

export const getCurrentBrowserConfig = (): ConfigResult => {
  const hostInfo = getCurrentHostInfo()
  if (!hostInfo) {
    return { config: null, source: "browser", error: "Not in browser environment" }
  }

  const config = createDefaultConfig(hostInfo.serverHost)
  return { config, source: "browser" }
}

export const fetchVersionConfigFromServer = async (
  serverHost: string
): Promise<VersionConfigResponse | null> => {
  const configUrl = `${serverHost}${VERSION_PATH}`

  try {
    const response = await fetch(configUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) {
      logger.warn(`Failed to fetch version config from ${configUrl}: ${response.status} ${response.statusText}`)
      return null
    }

    const data: VersionConfigResponse = await response.json()

    if (!(typeof data === "object" && data !== null)) {
      logger.warn("Invalid version config: not a valid object")
      return null
    }

    return data
  } catch (error) {
    logger.warn(
      `Error fetching version config from server: ${error instanceof Error ? error.message : "Unknown error"}`
    )
    return null
  }
}

export const getServerDefaultConfig = (): ConfigResult => {
  const defaultServerHost = "http://localhost:9000"
  const config = createDefaultConfig(defaultServerHost)
  return { config, source: "default" }
}

export const validateConfig = (
  config: SiteConfig
): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!config.serverHost) {
    errors.push("serverHost is required")
  }

  if (!config.api?.baseURL) {
    errors.push("api.baseURL is required")
  }

  if (!config.s3?.endpoint) {
    errors.push("s3.endpoint is required")
  }

  if (!config.s3?.region) {
    errors.push("s3.region is required")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
