class ApiClient {
  private instance: any

  constructor(baseURL: string, token?: string, options?: any) {
    this.instance = $fetch.create({
      baseURL,
      onRequest({ request, options }) {
        if (token) {
          options.headers.set('Authorization', `Bearer ${token}`)
        }
      },
      onResponse({ response }) {
        console.log('[API] response', response)
      },
      // ...options,
    })
  }

  getInstance() {
    return this.instance
  }

  async get(url: string, options?: any) {
    return this.instance(url, { method: 'GET', ...options })
  }

  async post(url: string, body: any, options?: any) {
    return this.instance(url, { method: 'POST', body, ...options })
  }

  async delete(url: string, options?: any) {
    return this.instance(url, { method: 'DELETE', ...options })
  }

  async put(url: string, body: any, options?: any) {
    return this.instance(url, { method: 'PUT', body, ...options })
  }

  async patch(url: string, body: any, options?: any) {
    return this.instance(url, { method: 'PATCH', body, ...options })
  }

  async head(url: string, options?: any) {
    return this.instance(url, { method: 'HEAD', ...options })
  }

  async options(url: string, options?: any) {
    return this.instance(url, { method: 'OPTIONS', ...options })
  }

  async trace(url: string, options?: any) {
    return this.instance(url, { method: 'TRACE', ...options })
  }
}

export default ApiClient
