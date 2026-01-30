import { hasConsoleScopes, type ConsolePolicy } from '~/utils/console-policy-parser'
import { PAGE_PERMISSIONS } from '~/utils/console-permissions'

export const usePermissions = () => {
  const { $api } = useNuxtApp()
  const { isAdmin } = useAuth()

  // Store user policy in global state
  const userPolicy = useState<ConsolePolicy | null>('user-policy', () => null)
  const userInfo = useState<any>('user-info', () => null)
  const isLoading = useState<boolean>('user-policy-loading', () => false)

  const fetchUserPolicy = async () => {
    isLoading.value = true
    try {
      const info = await $api.get('/accountinfo')
      userInfo.value = info
      let userInfoPolicy = info.policy as string
      userPolicy.value = JSON.parse(userInfoPolicy) as ConsolePolicy
    } catch (e) {
      console.error('Failed to fetch user policy', e)
      userPolicy.value = null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if user has specific permission(s)
   */
  const hasPermission = (action: string | string[], matchAll: boolean = true) => {
    if (isAdmin.value) return true

    // If we haven't loaded policy yet, we can't grant permission
    // Unless it's a public action (not handled here)
    if (!userPolicy.value) return false

    const actions = Array.isArray(action) ? action : [action]
    return hasConsoleScopes(userPolicy.value, actions, matchAll)
  }

  /**
   * Check if user can access a specific route path
   */
  const canAccessPath = (path: string) => {
    // 1. Admin always has access
    if (isAdmin.value) return true

    // 2. Check if path is protected
    // Exact match
    let requiredScopes = PAGE_PERMISSIONS[path]

    // If not found, try to find by matching start of path (e.g. sub-routes)
    // But PAGE_PERMISSIONS keys are simple paths.
    // MinIO usually maps exact paths.
    // Let's handle exact match first.
    if (!requiredScopes) {
      // If the path is not explicitly listed in PAGE_PERMISSIONS,
      // we need to decide if it's open or closed.
      // For now, let's assume if it's not listed, it might be a sub-page of something or public.
      // But better to be safe.
      // However, we have defined permissions for main pages.
      // If path is '/browser/bucket1', it should require '/browser' permission?
      // Let's implement simple prefix matching if exact match fails.
      const match = Object.keys(PAGE_PERMISSIONS).find(key => path.startsWith(key))
      if (match) {
        requiredScopes = PAGE_PERMISSIONS[match]
      }
    }

    if (!requiredScopes) {
      // Path not controlled by permissions (e.g. login, 404, or uncontrolled page)
      // Allow access
      return true
    }

    return hasPermission(requiredScopes)
  }

  return {
    userPolicy,
    userInfo,
    isLoading,
    fetchUserPolicy,
    hasPermission,
    canAccessPath,
    isAdmin,
  }
}
