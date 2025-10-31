/**
 * @fileoverview Configuration management utility module
 *
 * Provides unified configuration retrieval, validation, saving, and management functionality.
 * Supports multiple configuration sources: server, localStorage, browser, default config.
 *
 * @author Assistant
 * @version 2.0.0
 */

import type { SiteConfig } from '~/types/config';
import { logger } from './logger';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration source type
 */
type ConfigSource = 'browser' | 'localStorage' | 'server' | 'default';

/**
 * Server configuration response type (partial config, used for merging)
 */
interface ServerConfigResponse {
  /** API configuration */
  api?: {
    /** API base URL */
    baseURL?: string;
  };
  /** S3 configuration */
  s3?: {
    /** S3 endpoint */
    endpoint?: string;
    /** S3 region */
    region?: string;
    /** Access key ID */
    accessKeyId?: string;
    /** Secret access key */
    secretAccessKey?: string;
  };
  /** Session configuration */
  session?: {
    /** Session duration in seconds */
    durationSeconds?: number;
  };
}

/**
 * Configuration retrieval result
 */
interface ConfigResult {
  /** Retrieved configuration, null if failed */
  config: SiteConfig | null;
  /** Configuration source */
  source: ConfigSource;
  /** Error message (if any) */
  error?: string;
}

/**
 * Host information
 */
interface HostInfo {
  /** Protocol (http/https) */
  protocol: string;
  /** Hostname and port */
  host: string;
  /** Complete server host address */
  serverHost: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'rustfs-server-host';
const DEFAULT_REGION = 'us-east-1';
const API_PATH = '/rustfs/admin/v3';
const CONFIG_PATH = '/config.json';
const REQUEST_TIMEOUT = 5000;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if in browser environment
 * @returns Returns true if in browser environment, false otherwise
 */
const isBrowser = (): boolean => typeof window !== 'undefined';

/**
 * Get current host information
 * @returns Host info object, returns null if not in browser environment
 */
const getCurrentHostInfo = (): HostInfo | null => {
  if (!isBrowser()) return null;

  const protocol = window.location.protocol.replace(':', '');
  const host = window.location.host;
  const serverHost = `${protocol}://${host}`;

  return { protocol, host, serverHost };
};

/**
 * Validate server configuration response
 * @param config - Configuration object to validate
 * @returns Returns true if valid server configuration
 */
const isValidServerConfig = (config: unknown): config is ServerConfigResponse => {
  return typeof config === 'object' && config !== null;
};

/**
 * Create default configuration
 * @param serverHost - Server host address
 * @returns Complete site configuration object
 *
 * @example
 * ```typescript
 * const config = createDefaultConfig('https://example.com:9000')
 * console.log(config.api.baseURL) // 'https://example.com:9000/rustfs/admin/v3'
 * ```
 */
export const createDefaultConfig = (serverHost: string): SiteConfig => {
  return {
    serverHost,
    api: {
      baseURL: `${serverHost}${API_PATH}`,
    },
    s3: {
      endpoint: serverHost,
      region: DEFAULT_REGION,
      accessKeyId: '',
      secretAccessKey: '',
    },
  };
};

// ============================================================================
// Configuration Retrieval Functions
// ============================================================================

/**
 * Get saved host configuration from localStorage
 * @returns Configuration retrieval result, containing config object, source, and possible error message
 *
 * @example
 * ```typescript
 * const result = getStoredHostConfig()
 * if (result.config) {
 *   console.log('Using saved config:', result.config.serverHost)
 * } else {
 *   console.log('Retrieval failed:', result.error)
 * }
 * ```
 */
export const getStoredHostConfig = (): ConfigResult => {
  if (!isBrowser()) {
    return { config: null, source: 'localStorage', error: 'Not in browser environment' };
  }

  const savedHost = localStorage.getItem(STORAGE_KEY);
  if (!savedHost) {
    return { config: null, source: 'localStorage', error: 'No saved host found' };
  }

  try {
    const url = new URL(savedHost);
    const serverHost = `${url.protocol}//${url.host}`;
    const config = createDefaultConfig(serverHost);
    return { config, source: 'localStorage' };
  } catch (error) {
    const errorMessage = `Invalid saved host configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
    logger.warn(errorMessage);
    return { config: null, source: 'localStorage', error: errorMessage };
  }
};

/**
 * Get current browser host configuration
 * @returns Configuration retrieval result based on current browser address
 *
 * @example
 * ```typescript
 * // If current page is https://localhost:3000
 * const result = getCurrentBrowserConfig()
 * console.log(result.config?.serverHost) // 'https://localhost:3000'
 * ```
 */
export const getCurrentBrowserConfig = (): ConfigResult => {
  const hostInfo = getCurrentHostInfo();
  if (!hostInfo) {
    return { config: null, source: 'browser', error: 'Not in browser environment' };
  }

  const config = createDefaultConfig(hostInfo.serverHost);
  return { config, source: 'browser' };
};

/**
 * Fetch raw configuration data from server
 */
const fetchRawConfigFromServer = async (serverHost: string): Promise<ServerConfigResponse | null> => {
  const configUrl = `${serverHost}${CONFIG_PATH}`;

  try {
    const response = await fetch(configUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      logger.warn(`Failed to fetch config from ${configUrl}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!isValidServerConfig(data)) {
      logger.warn('Invalid server config: not a valid object');
      return null;
    }

    logger.info(`Successfully loaded config from server: ${configUrl}`);
    return data;
  } catch (error) {
    logger.warn(`Error fetching config from server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

/**
 * Merge server configuration with default configuration
 */
const mergeServerConfig = (baseConfig: SiteConfig, serverConfig: ServerConfigResponse): SiteConfig => {
  return {
    ...baseConfig,
    api: {
      baseURL: serverConfig.api?.baseURL || baseConfig.api.baseURL,
    },
    s3: {
      endpoint: serverConfig.s3?.endpoint || baseConfig.s3.endpoint,
      region: serverConfig.s3?.region || baseConfig.s3.region,
      accessKeyId: serverConfig.s3?.accessKeyId || baseConfig.s3.accessKeyId,
      secretAccessKey: serverConfig.s3?.secretAccessKey || baseConfig.s3.secretAccessKey,
    },
    session: serverConfig.session
      ? {
          durationSeconds: serverConfig.session.durationSeconds || 0,
        }
      : baseConfig.session,
  };
};

/**
 * Fetch configuration from server and merge with default configuration
 */
export const fetchConfigFromServer = async (): Promise<ConfigResult> => {
  const browserResult = getCurrentBrowserConfig();
  if (!browserResult.config) {
    return { config: null, source: 'server', error: browserResult.error };
  }

  const serverConfig = await fetchRawConfigFromServer(browserResult.config.serverHost);
  if (!serverConfig) {
    return {
      config: browserResult.config,
      source: 'browser',
      error: 'Failed to fetch server config, using browser config',
    };
  }

  const mergedConfig = mergeServerConfig(browserResult.config, serverConfig);
  return { config: mergedConfig, source: 'server' };
};

// ============================================================================
// Advanced Configuration Retrieval Functions
// ============================================================================

/**
 * Configuration priority strategy: server > localStorage > browser > default
 *
 * Attempts to retrieve configuration in the following priority order:
 * 1. Server configuration (from current host's /config.json)
 * 2. Configuration saved in localStorage
 * 3. Current browser host configuration
 * 4. Default configuration (localhost:9000)
 *
 * @returns Promise containing the final configuration retrieval result
 *
 * @example
 * ```typescript
 * const result = await getConfig()
 * if (result.config) {
 *   console.log(`Using ${result.source} config:`, result.config.serverHost)
 * }
 * ```
 */
export const getConfig = async (): Promise<ConfigResult> => {
  // 1. Try to get configuration from server
  const serverResult = await fetchConfigFromServer();
  if (serverResult.config && serverResult.source === 'server') {
    return serverResult;
  }

  // 2. Try to get configuration from localStorage
  const storedResult = getStoredHostConfig();
  if (storedResult.config) {
    return storedResult;
  }

  // 3. Use current browser configuration
  const browserResult = getCurrentBrowserConfig();
  if (browserResult.config) {
    return browserResult;
  }

  // 4. Use default configuration
  return getServerDefaultConfig();
};

/**
 * Get server default configuration
 */
export const getServerDefaultConfig = (): ConfigResult => {
  const defaultServerHost = 'http://localhost:9000';
  const config = createDefaultConfig(defaultServerHost);
  return { config, source: 'default' };
};

// ============================================================================
// Compatibility Functions (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use getStoredHostConfig() instead
 */
export const getStoredHostConfigLegacy = (): SiteConfig | null => {
  const result = getStoredHostConfig();
  return result.config;
};

/**
 * @deprecated Use getCurrentBrowserConfig() instead
 */
export const getCurrentBrowserConfigLegacy = (): SiteConfig | null => {
  const result = getCurrentBrowserConfig();
  return result.config;
};

// ============================================================================
// Configuration Management Functions
// ============================================================================

/**
 * Save host configuration to localStorage
 */
export const saveHostConfig = (serverHost: string): ConfigResult => {
  if (!isBrowser()) {
    return { config: null, source: 'localStorage', error: 'Not in browser environment' };
  }

  try {
    // Validate URL format
    new URL(serverHost);
    localStorage.setItem(STORAGE_KEY, serverHost);

    const config = createDefaultConfig(serverHost);
    logger.info(`Saved host configuration: ${serverHost}`);
    return { config, source: 'localStorage' };
  } catch (error) {
    const errorMessage = `Invalid server host format: ${error instanceof Error ? error.message : 'Unknown error'}`;
    logger.warn(errorMessage);
    return { config: null, source: 'localStorage', error: errorMessage };
  }
};

/**
 * Clear saved host configuration
 */
export const clearStoredHostConfig = (): boolean => {
  if (!isBrowser()) return false;

  try {
    localStorage.removeItem(STORAGE_KEY);
    logger.info('Cleared stored host configuration');
    return true;
  } catch (error) {
    logger.warn('Failed to clear stored host configuration:', error);
    return false;
  }
};

/**
 * Validate if configuration is complete
 */
export const validateConfig = (config: SiteConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.serverHost) {
    errors.push('serverHost is required');
  }

  if (!config.api?.baseURL) {
    errors.push('api.baseURL is required');
  }

  if (!config.s3?.endpoint) {
    errors.push('s3.endpoint is required');
  }

  if (!config.s3?.region) {
    errors.push('s3.region is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// Debugging and Utility Functions
// ============================================================================

/**
 * Get all available configuration source information (for debugging)
 */
export const getConfigSources = async (): Promise<{
  browser: ConfigResult;
  localStorage: ConfigResult;
  server: ConfigResult;
  default: ConfigResult;
}> => {
  const [browser, localStorage, server] = await Promise.all([
    Promise.resolve(getCurrentBrowserConfig()),
    Promise.resolve(getStoredHostConfig()),
    fetchConfigFromServer(),
  ]);

  const defaultConfig = getServerDefaultConfig();

  return {
    browser,
    localStorage,
    server,
    default: defaultConfig,
  };
};
