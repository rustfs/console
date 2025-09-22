export default defineNuxtRouteMiddleware((to, from) => {
  const isAuthenticated = useAuth().isAuthenticated.value;

  // 允许访问登录页面和配置页面
  if (to.path === '/auth/login' || to.path === '/config') {
    if (isAuthenticated && to.path === '/auth/login') {
      return navigateTo('/');
    }

    return;
  }

  if (!isAuthenticated) {
    return navigateTo('/auth/login');
  }
});
