import { request } from '../http'

interface Ilogin {
  accessKey: string
  secretKey: string
}

// 用户登录 获取cookie
export function fetchLogin(data: Ilogin) {
  const methodInstance = request.Post('/login', data)
  return methodInstance
}

// 用户登录之后回调get请求
export function fetchLoginGet() {
  const methodInstance = request.Get('/login')
  return methodInstance
}

// 获取用户信息
export function fetchSession() {
  const methodInstance = request.Get('/session')
  return methodInstance
}

// 退出
export function fetchLogout(body: object) {
  const methodInstance = request.Post('/logout', body)
  return methodInstance
}

export interface LoginOauth2AuthRequest {
  state: string
  code: string
}
export function loginOauth2Auth(body: LoginOauth2AuthRequest) {
  const methodInstance = request.Post('/login/oauth2/auth', body)
  return methodInstance
}
