

export default defineNuxtRouteMiddleware((to, from) => {
  const isAuthenticated = useAuth().isAuthenticated.value

  console.debug('Auth middleware', to.path, isAuthenticated);

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
