

export default defineNuxtRouteMiddleware((to, from) => {
  const isAuthenticated = useAuth().isAuthenticated.value

  if (to.path === '/auth/login') {
    if (isAuthenticated) {
      return navigateTo('/')
    }

    return
  }

  if (!isAuthenticated) {
    return navigateTo('/auth/login')
  }
})
