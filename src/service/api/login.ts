import { request } from '../http'

interface Ilogin {
  accessKey: string
  secretKey: string
}

// 用户登录 获取cookie
export function fetchLogin(data: Ilogin) {
  const methodInstance = request.Post<Service.ResponseResult<Api.Login.Info>>('/login', data)
  return methodInstance
}

// 用户登录之后回调get请求
export function fetchLoginGet() {
  const methodInstance = request.Get<Service.ResponseResult<Api.Login.Info>>('/login')
  return methodInstance
}

export function fetchSession() {
  const methodInstance = request.Get<Service.ResponseResult<Api.Login.Info>>('/session')
  return methodInstance
}
