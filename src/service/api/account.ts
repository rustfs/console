import { request } from '../http'

// 修改秘钥的请求数据类型
export interface AccountChangePasswordRequest {
  current_secret_key: string
  new_secret_key: string
}

/**
 * @desc 修改当前账号密码
 * @param data
 * @returns 操作结果
 */
export function accountChangePassword(data: AccountChangePasswordRequest) {
  const methodInstance = request.Post('/account/change-password', data)
  return methodInstance
}

// 修改用户秘钥数据类型
export interface ChangeUserPasswordRequest {
  selectedUser: string
  newSecretKey: string
}
/**
 * 修改用户秘钥
 * @param data
 * @returns 结果
 */
export function changeUserPassword(data: ChangeUserPasswordRequest) {
  const methodInstance = request.Post('/account/change-user-password', data)
  return methodInstance
}

/** **********************************ServiceAccounts */

export interface ServiceAccount {
  accountStatus?: string
  name?: string
  description?: string
  expiration?: string
  accessKey?: string
}

/**
 * 获取访问秘钥
 * @param params
 * @returns 秘钥列表
 */
export function listUserServiceAccounts(params: object) {
  const methodInstance = request.Get('/service-accounts', { params })
  return methodInstance
}
