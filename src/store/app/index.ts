import { local, setLocale } from '@/utils'
// 全局主题
import type { GlobalThemeOverrides } from 'naive-ui'
import { colord } from 'colord'
import { set } from 'radash'
// 默认主题样式
import themeConfig from './theme.json'

// 动画效果
export type TransitionAnimation = '' | 'fade-slide' | 'fade-bottom' | 'fade-scale' | 'zoom-fade' | 'zoom-out'

// 布局模式
export type LayoutMode = 'leftMenu' | 'topMenu' | 'mixMenu'

// 默认语言与版权
const { VITE_DEFAULT_LANG, VITE_COPYRIGHT_INFO } = import.meta.env

const docEle = ref(document.documentElement)

// 全屏控制
const { isFullscreen, toggle } = useFullscreen(docEle)

const { system, store } = useColorMode({
  emitAuto: true,
})

export const useAppStore = defineStore('app-store', {
  state: () => {
    return {
      // 脚部版权文字描述
      footerText: VITE_COPYRIGHT_INFO,
      // 语言
      lang: VITE_DEFAULT_LANG,
      // 主题
      theme: themeConfig as GlobalThemeOverrides,
      // 主要色彩
      primaryColor: themeConfig.common.primaryColor,
      // 是否展开
      collapsed: false,
      // 灰色模式
      grayMode: false,
      // 若色彩模式
      colorWeak: false,
      // 加载状态
      loadFlag: true,
      // 是否显示logo
      showLogo: true,
      // 是否显示tabs
      showTabs: true,
      // 是否显示脚部
      showFooter: true,
      // 是否显示加载进度条
      showProgress: true,
      // 是否显示面包屑
      showBreadcrumb: true,
      // 是否显示面包屑图标
      showBreadcrumbIcon: true,
      // 是否显示水印
      showWatermark: false,
      // 是否显示设置菜单
      showSetting: false,
      // 动画
      transitionAnimation: 'fade-slide' as TransitionAnimation,
      // 默认布局
      layoutMode: 'leftMenu' as LayoutMode,
      // 全屏状态
      contentFullScreen: false,
    }
  },
  getters: {
    storeColorMode() {
      return store.value
    },
    colorMode() {
      return store.value === 'auto' ? system.value : store.value
    },
    fullScreen() {
      return isFullscreen.value
    },
  },
  actions: {
    // 重置所有设置
    resetAlltheme() {
      this.theme = themeConfig
      this.primaryColor = '#18a058'
      this.collapsed = false
      this.grayMode = false
      this.colorWeak = false
      this.loadFlag = true
      this.showLogo = true
      this.showTabs = true
      this.showFooter = true
      this.showBreadcrumb = true
      this.showBreadcrumbIcon = true
      this.showWatermark = false
      this.transitionAnimation = 'fade-slide'
      this.layoutMode = 'leftMenu'
      this.contentFullScreen = false

      // 重置所有配色
      this.setPrimaryColor(this.primaryColor)
    },
    setAppLang(lang: App.lang) {
      setLocale(lang)
      local.set('lang', lang)
      this.lang = lang
    },
    /* 设置主题色 */
    setPrimaryColor(color: string) {
      const brightenColor = colord(color).lighten(0.05).toHex()
      const darkenColor = colord(color).darken(0.05).toHex()
      set(this.theme, 'common.primaryColor', color)
      set(this.theme, 'common.primaryColorHover', brightenColor)
      set(this.theme, 'common.primaryColorPressed', darkenColor)
      set(this.theme, 'common.primaryColorSuppl', brightenColor)
    },
    setColorMode(mode: 'light' | 'dark' | 'auto') {
      store.value = mode
    },
    /* 切换侧边栏收缩 */
    toggleCollapse() {
      this.collapsed = !this.collapsed
    },
    /* 切换全屏 */
    toggleFullScreen() {
      toggle()
    },
    /**
     * @description: 页面内容重载
     * @param {number} delay - 延迟毫秒数
     * @return {*}
     */
    async reloadPage(delay = 600) {
      this.loadFlag = false
      await nextTick()
      if (delay) {
        setTimeout(() => {
          this.loadFlag = true
        }, delay)
      }
      else {
        this.loadFlag = true
      }
    },
    /* 切换色弱模式 */
    toggleColorWeak() {
      docEle.value.classList.toggle('color-weak')
      this.colorWeak = docEle.value.classList.contains('color-weak')
    },
    /* 切换灰色模式 */
    toggleGrayMode() {
      docEle.value.classList.toggle('gray-mode')
      this.grayMode = docEle.value.classList.contains('gray-mode')
    },
  },
  persist: {
    storage: localStorage,
  },
})
