/**
 * @fileoverview 配置管理工具模块
 *
 * 提供统一的配置获取、验证、保存和管理功能。
 * 支持多种配置源：服务器、localStorage、浏览器、默认配置。
 *
 * @author Assistant
 * @version 2.0.0
 */

import type { SiteConfig } from '~/types/config';
import { logger } from './logger';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 配置来源类型
 */
type ConfigSource = 'browser' | 'localStorage' | 'server' | 'default';

/**
 * 服务器配置响应类型（部分配置，用于合并）
 */
interface ServerConfigResponse {
  /** API 配置 */
  api?: {
    /** API 基础 URL */
    baseURL?: string;
  };
  /** S3 配置 */
  s3?: {
    /** S3 端点 */
    endpoint?: string;
    /** S3 区域 */
    region?: string;
    /** 访问密钥 ID */
    accessKeyId?: string;
    /** 秘密访问密钥 */
    secretAccessKey?: string;
  };
  /** 会话配置 */
  session?: {
    /** 会话持续时间（秒） */
    durationSeconds?: number;
  };
}

/**
 * 配置获取结果
 */
interface ConfigResult {
  /** 获取到的配置，如果失败则为 null */
  config: SiteConfig | null;
  /** 配置来源 */
  source: ConfigSource;
  /** 错误信息（如果有） */
  error?: string;
}

/**
 * 主机信息
 */
interface HostInfo {
  /** 协议（http/https） */
  protocol: string;
  /** 主机名和端口 */
  host: string;
  /** 完整的服务器主机地址 */
  serverHost: string;
}

// ============================================================================
// 常量定义
// ============================================================================

const STORAGE_KEY = 'rustfs-server-host';
const DEFAULT_REGION = 'us-east-1';
const API_PATH = '/rustfs/admin/v3';
const CONFIG_PATH = '/config.json';
const REQUEST_TIMEOUT = 5000;

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 检查是否在浏览器环境
 * @returns 如果在浏览器环境中返回 true，否则返回 false
 */
const isBrowser = (): boolean => typeof window !== 'undefined';

/**
 * 获取当前主机信息
 * @returns 主机信息对象，如果不在浏览器环境中则返回 null
 */
const getCurrentHostInfo = (): HostInfo | null => {
  if (!isBrowser()) return null;

  const protocol = window.location.protocol.replace(':', '');
  const host = window.location.host;
  const serverHost = `${protocol}://${host}`;

  return { protocol, host, serverHost };
};

/**
 * 验证服务器配置响应
 * @param config - 待验证的配置对象
 * @returns 如果是有效的服务器配置则返回 true
 */
const isValidServerConfig = (config: unknown): config is ServerConfigResponse => {
  return typeof config === 'object' && config !== null;
};

/**
 * 创建默认配置
 * @param serverHost - 服务器主机地址
 * @returns 完整的站点配置对象
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
// 配置获取函数
// ============================================================================

/**
 * 从localStorage获取保存的主机配置
 * @returns 配置获取结果，包含配置对象、来源和可能的错误信息
 *
 * @example
 * ```typescript
 * const result = getStoredHostConfig()
 * if (result.config) {
 *   console.log('使用保存的配置:', result.config.serverHost)
 * } else {
 *   console.log('获取失败:', result.error)
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
 * 获取当前浏览器主机配置
 * @returns 基于当前浏览器地址的配置获取结果
 *
 * @example
 * ```typescript
 * // 如果当前页面是 https://localhost:3000
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
 * 从服务器获取原始配置数据
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
 * 合并服务器配置与默认配置
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
 * 从服务器获取配置并与默认配置合并
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
// 高级配置获取函数
// ============================================================================

/**
 * 获取配置的优先级策略：server > localStorage > browser > default
 *
 * 按照以下优先级顺序尝试获取配置：
 * 1. 服务器配置（从当前主机的 /config.json 获取）
 * 2. localStorage 中保存的配置
 * 3. 当前浏览器主机配置
 * 4. 默认配置（localhost:9000）
 *
 * @returns Promise 包含最终获取到的配置结果
 *
 * @example
 * ```typescript
 * const result = await getConfig()
 * if (result.config) {
 *   console.log(`使用 ${result.source} 配置:`, result.config.serverHost)
 * }
 * ```
 */
export const getConfig = async (): Promise<ConfigResult> => {
  // 1. 尝试从服务器获取配置
  const serverResult = await fetchConfigFromServer();
  if (serverResult.config && serverResult.source === 'server') {
    return serverResult;
  }

  // 2. 尝试从 localStorage 获取配置
  const storedResult = getStoredHostConfig();
  if (storedResult.config) {
    return storedResult;
  }

  // 3. 使用当前浏览器配置
  const browserResult = getCurrentBrowserConfig();
  if (browserResult.config) {
    return browserResult;
  }

  // 4. 使用默认配置
  return getServerDefaultConfig();
};

/**
 * 获取服务端默认配置
 */
export const getServerDefaultConfig = (): ConfigResult => {
  const defaultServerHost = 'http://localhost:9000';
  const config = createDefaultConfig(defaultServerHost);
  return { config, source: 'default' };
};

// ============================================================================
// 兼容性函数（保持向后兼容）
// ============================================================================

/**
 * @deprecated 使用 getStoredHostConfig() 替代
 */
export const getStoredHostConfigLegacy = (): SiteConfig | null => {
  const result = getStoredHostConfig();
  return result.config;
};

/**
 * @deprecated 使用 getCurrentBrowserConfig() 替代
 */
export const getCurrentBrowserConfigLegacy = (): SiteConfig | null => {
  const result = getCurrentBrowserConfig();
  return result.config;
};

// ============================================================================
// 配置管理函数
// ============================================================================

/**
 * 保存主机配置到 localStorage
 */
export const saveHostConfig = (serverHost: string): ConfigResult => {
  if (!isBrowser()) {
    return { config: null, source: 'localStorage', error: 'Not in browser environment' };
  }

  try {
    // 验证 URL 格式
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
 * 清除保存的主机配置
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
 * 验证配置是否完整
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
// 调试和工具函数
// ============================================================================

/**
 * 获取所有可用的配置源信息（用于调试）
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
