/**
 * 路由工具函数
 * 统一管理路由路径和导航逻辑
 */
import { joinURL } from 'ufo';

/**
 * 获取应用的 baseURL
 * @returns baseURL 路径
 */
function getBaseURL(): string {
  // 在客户端，从 window.location 推断 baseURL
  if (process.client) {
    const pathname = window.location.pathname;
    // 如果路径以 /rustfs/console 开头，提取基础路径
    const match = pathname.match(/^(\/rustfs\/console)/);
    if (match) {
      return match[1] + '/';
    }
  }

  // 默认值
  return '/rustfs/console/';
}

/**
 * 构建完整路由路径（包含 baseURL）
 * @param path 路由路径
 * @returns 完整路径
 */
export function buildRoute(path: string): string {
  const baseURL = getBaseURL();
  return joinURL(baseURL.replace(/\/$/, ''), path.replace(/^\//, ''));
}

/**
 * 导航到指定路由
 * @param path 路由路径
 * @param options 导航选项
 */
export async function navigateToRoute(
  path: string,
  options?: { external?: boolean; replace?: boolean }
): Promise<void> {
  const fullPath = buildRoute(path);

  if (options?.external) {
    window.location.href = fullPath;
  } else {
    await navigateTo(fullPath, { replace: options?.replace });
  }
}

/**
 * 获取登录页面路径
 * @returns 登录页面完整路径
 */
export function getLoginRoute(): string {
  return buildRoute('/auth/login');
}

