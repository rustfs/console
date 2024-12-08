
type FetchType = typeof $fetch
class ApiClient {
  private $api: any

  constructor(api: FetchType) {
    this.$api = api
  }

  async get(url: string, options?: any) {
    return this.$api(url, { method: 'GET', ...options })
  }

  async post(url: string, body: any, options?: any) {
    return this.$api(url, { method: 'POST', body, ...options })
  }

  async delete(url: string, options?: any) {
    return this.$api(url, { method: 'DELETE', ...options })
  }

  async put(url: string, body: any, options?: any) {
    return this.$api(url, { method: 'PUT', body, ...options })
  }

  async patch(url: string, body: any, options?: any) {
    return this.$api(url, { method: 'PATCH', body, ...options })
  }

  async head(url: string, options?: any) {
    return this.$api(url, { method: 'HEAD', ...options })
  }

  async options(url: string, options?: any) {
    return this.$api(url, { method: 'OPTIONS', ...options })
  }

  async trace(url: string, options?: any) {
    return this.$api(url, { method: 'TRACE', ...options })
  }
}

export default ApiClient
