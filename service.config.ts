/** 不同请求服务的环境配置 */
export const serviceConfig: Record<ServiceEnvType, Record<string, string>> = {
  dev: {
    url: 'http://220.181.1.138:9001',
  },
  test: {
    url: 'http://220.181.1.138:9001',
  },
  prod: {
    url: 'http://220.181.1.138:9001',
  },
}
