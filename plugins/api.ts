import ApiClient from "~/lib/api-client"

export default defineNuxtPlugin((nuxtApp) => {
  const token = useCookie('token')

  const fetch = $fetch.create({
    baseURL: '/api',
    onRequest({ request, options }) {
      if (token) {
        options.headers.set('Authorization', `Bearer ${token}`)
      }
    },
    onResponse({ response }) {
      console.log('[API] response', response)
    },
    async onResponseError({ response }: { response: { status: number } }) {
      console.error(response);
      if (response.status === 401) {
        token.value = undefined
        await nuxtApp.runWithContext(() => navigateTo('/auth/login'))
      }
    }
  })

  // Expose to useNuxtApp().$api, useNuxtApp().$apiFetch
  return {
    provide: {
      api: new ApiClient(fetch),
      apiFetch: fetch
    }
  }
})
