export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isAuthenticated, isAdmin } = useAuth()
  const { fetchUserPolicy, canAccessPath, userPolicy } = usePermissions()

  // 允许访问登录页面和配置页面
  if (to.path === '/auth/login' || to.path === '/config') {
    if (isAuthenticated.value && to.path === '/auth/login') {
      return navigateTo('/')
    }

    return
  }

  if (!isAuthenticated.value) {
    return navigateTo('/auth/login?unauthorized=true')
  }

  // Ensure policy is loaded for non-admin users
  if (!isAdmin.value && !userPolicy.value) {
    await fetchUserPolicy()
  }

  // Check permission for the route
  if (!canAccessPath(to.path)) {
    return abortNavigation({
      statusCode: 403,
      message: 'You do not have permission to access this page.',
    })
  }
})
