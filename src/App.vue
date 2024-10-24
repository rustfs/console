<script setup lang="ts">
import { naiveI18nOptions } from '@/utils'

// 主DOM树
import { darkTheme } from 'naive-ui'
import { useAppStore, useAuthStore } from './store'

const authStore = useAuthStore()
const appStore = useAppStore()
const route = useRoute()
// 水印文字
const { VITE_WATERMARK_CONTENT } = import.meta.env

const naiveLocale = computed(() => {
  return naiveI18nOptions[appStore.lang] ? naiveI18nOptions[appStore.lang] : naiveI18nOptions.enUS
},
)

onMounted(() => {
  route.name !== 'login' && authStore.refreshUserInfo()
})
</script>

<template>
  <!-- 主题设置 禁用inline css -->
  <!-- 设置主题颜色 主题的语言以及日期的语言  设置主题的变量 -->
  <n-config-provider
    class="wh-full" inline-theme-disabled :theme="appStore.colorMode === 'dark' ? darkTheme : null"
    :locale="naiveLocale.locale" :date-locale="naiveLocale.dateLocale" :theme-overrides="appStore.theme"
  >
    <!-- 提供 交互组件的容器 -->
    <naive-provider>
      <router-view />
      <Watermark
        :show-watermark="appStore.showWatermark" :text="VITE_WATERMARK_CONTENT"
      />
    </naive-provider>
  </n-config-provider>
</template>
