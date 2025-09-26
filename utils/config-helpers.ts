import type { SiteConfig } from '~/types/config';
import { logger } from './logger';

/**
 * 创建默认配置
 */
export const createDefaultConfig = (serverHost: string): SiteConfig => {
  return {
    serverHost,
    api: {
      baseURL: `${serverHost}/rustfs/admin/v3`,
    },
    s3: {
      endpoint: serverHost,
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
    },
  };
};

/**
 * 从localStorage获取保存的主机配置
 */
export const getStoredHostConfig = (): SiteConfig | null => {
  if (typeof window === 'undefined') return null;

  const savedHost = localStorage.getItem('rustfs-server-host');
  if (!savedHost) return null;

  try {
    const url = new URL(savedHost);
    const serverHost = `${url.protocol}//${url.host}`;
    return createDefaultConfig(serverHost);
  } catch (error) {
    logger.warn('Invalid saved host configuration:', error);
    return null;
  }
};

/**
 * 获取当前浏览器主机配置
 */
export const getCurrentBrowserConfig = (): SiteConfig | null => {
  if (typeof window === 'undefined') return null;

  const currentHost = window.location.host;
  const protocol = window.location.protocol.replace(':', '');
  const serverHost = `${protocol}://${currentHost}`;

  return createDefaultConfig(serverHost);
};

/**
 * 从当前浏览器host获取配置
 */
export const fetchConfigFromServer = async (): Promise<SiteConfig | null> => {
  if (typeof window === 'undefined') return null;

  try {
    const currentHost = window.location.hostname;
    const protocol = window.location.protocol;
    const serverHost = `${protocol}://${currentHost}`;
    const configUrl = `${protocol}//${currentHost}/config.json`;

    const response = await fetch(configUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 设置5秒超时
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.warn(`Failed to fetch config from ${configUrl}: ${response.status} ${response.statusText}`);
      return null;
    }

    const serverConfig = await response.json();

    // 验证配置格式 - 检查是否为对象
    if (typeof serverConfig !== 'object' || serverConfig === null) {
      // logger.warn('Invalid server config: not a valid object');
      return null;
    }

    // 直接使用返回的配置数据
    const config: SiteConfig = {
      serverHost: serverHost,
      api: {
        baseURL: serverConfig.api?.baseURL || `${serverHost}/rustfs/admin/v3`,
      },
      s3: {
        endpoint: serverConfig.s3?.endpoint || serverHost,
        region: serverConfig.s3?.region || 'us-east-1',
        accessKeyId: serverConfig.s3?.accessKeyId || '',
        secretAccessKey: serverConfig.s3?.secretAccessKey || '',
      },
    };

    logger.info(`Successfully loaded config from server: ${configUrl}`);
    return config;
  } catch (error) {
    logger.warn(`Error fetching config from server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

/**
 * 获取服务端默认配置
 */
export const getServerDefaultConfig = (): SiteConfig => {
  // 注意：这里按照用户要求，服务端也应该尽量使用当前host
  // 但由于服务端限制，只能使用localhost作为fallback
  const defaultServerHost = 'http://localhost:9000';
  return createDefaultConfig(defaultServerHost);
};
