// 处理配置对象
import { generateProxyPattern } from '@/../build/proxy'
// 获取环境配置
import { serviceConfig } from '@/../service.config'
// 请求实例
import { createAlovaInstance } from './alova'

// 是否代理
const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y'

// 处理之后的请求地址对象{proxy ,value}
const { url } = generateProxyPattern(serviceConfig[import.meta.env.MODE])

// 设置请求的baseurl
export const request = createAlovaInstance({
  baseURL: isHttpProxy ? url.proxy : url.value,
})
