import ApiClient from "~/lib/api-client"

export default defineNuxtPlugin((nuxtApp) => {
  const token = useCookie('token')

  const api = new ApiClient(
    '/api',
    token.value as string | undefined,
    {
      async onResponseError({ response }: { response: { status: number } }) {
        if (response.status === 401) {
          await nuxtApp.runWithContext(() => navigateTo('/auth/login'))
        }
      }
    }
  )

  // Expose to useNuxtApp().$api, useNuxtApp().$apiFetch
  return {
    provide: {
      api,
      apiFetch: api.getInstance()
    }
  }
})
