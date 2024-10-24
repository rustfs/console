<script setup lang="ts">
// 设置抽屉
import { SettingDrawer } from './components'
// 左侧菜单
import leftMenu from './leftMenu.layout.vue'
// 混合式菜单
import mixMenu from './mixMenu.layout.vue'
// 顶部菜单
import topMenu from './topMenu.layout.vue'
import { useAppStore } from '@/store/app'

const appStore = useAppStore()
const layoutMap = {
  leftMenu,
  topMenu,
  mixMenu,
}
</script>

<template>
  <SettingDrawer />
  <component :is="layoutMap[appStore.layoutMode]" />
</template>
