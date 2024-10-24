import { router } from '@/router'
import { fetchLogin, fetchLoginGet, fetchSession } from '@/service'
import { local } from '@/utils'
import { useRouteStore } from './router'
import { useTabStore } from './tab'

export interface PermissionResource {
  resource?: string
  conditionOperator?: string
  prefixes?: string[]
}

export interface EnvironmentConstants {
  maxConcurrentUploads?: number
  maxConcurrentDownloads?: number
}

export interface SessionResponse {
  features?: string[]
  status?: 'ok'
  operator?: boolean
  distributedMode?: boolean
  serverEndPoint?: string
  permissions?: Record<string, string[]>
  customStyles?: string
  allowResources?: PermissionResource[]
  envConstants?: EnvironmentConstants
}
export const useAuthStore = defineStore('auth-store', {
  state: (): any => {
    return {
      sessionInfo: local.get('sessionInfo'),
    }
  },
  getters: {
    /** 是否登录 */
    isLogin(state) {
      return Boolean(state.sessionInfo)
    },
  },
  actions: {
    /* 登录退出，重置用户信息等 */
    async logout() {
      const route = unref(router.currentRoute)
      // 清除本地缓存
      this.clearAuthStorage()
      // 清空路由、菜单等数据
      const routeStore = useRouteStore()
      routeStore.resetRouteStore()
      // 清空标签栏数据
      const tabStore = useTabStore()
      tabStore.clearAllTabs()
      // 重置当前存储库
      this.$reset()
      // 重定向到登录页
      if (route.meta.requiresAuth) {
        router.push({
          name: 'login',
          query: {
            redirect: route.fullPath,
          },
        })
      }
    },
    clearAuthStorage() {
      local.remove('sessionInfo')
    },

    /* 用户登录 */
    async login(accessKey: string, secretKey: string) {
      try {
        const { isSuccess } = await fetchLogin({ accessKey, secretKey })
        if (!isSuccess)
          return

        // 调用get的登录
        const res = await fetchLoginGet()
        if (!res.isSuccess)
          return
        local.set('userLoggedIn', { accessKey, secretKey })

        this.refreshUserInfo()
      }
      //
      catch (e) {
        console.warn('[Login Error]:', e)
      }
    },

    // 刷新用户信息
    async refreshUserInfo() {
      const data = await fetchSession()
      await this.handleLoginInfo(data)
    },

    /* 处理登录返回的数据 */
    async handleLoginInfo(data: Api.Login.Info) {
      local.set('sessionInfo', data)
      this.sessionInfo = data

      // 添加路由和菜单
      const routeStore = useRouteStore()
      await routeStore.initAuthRoute()

      // 进行重定向跳转
      const route = unref(router.currentRoute)
      const query = route.query as { redirect: string }
      router.push({
        path: query.redirect || '/',
      })
    },
  },
})
