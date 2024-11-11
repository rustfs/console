import { request } from '../http'

// 获取所有路由信息
export function fetchAllRoutes() {
  return request.Get('/getUserRoutes')
}

// 获取所有用户信息
export function fetchUserPage() {
  return request.Get('/userPage')
}
// 获取所有角色列表
export function fetchRoleList() {
  return request.Get('/role/list')
}

/**
 * 请求获取字典列表
 *
 * @param code - 字典编码，用于筛选特定的字典列表
 * @returns 返回的字典列表数据
 */
export function fetchDictList(code?: string) {
  const params = { code }
  return request.Get('/dict/list', { params })
}
