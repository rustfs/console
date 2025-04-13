<template>
  <div :class="isDark ? 'dark' : ''">
    <n-config-provider :theme="theme" :locale="locale" :theme-overrides="themeOverrides" :date-locale="dateLocale">
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider>
            <NuxtLayout>
              <NuxtPage />
            </NuxtLayout>
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-config-provider>
  </div>
</template>
<script lang="ts" setup>
import { useColorMode } from '@vueuse/core'
import {
  darkTheme,
  dateZhCN,
  zhCN,
  type NDateLocale,
  type NLocale
} from 'naive-ui'
import { ref } from 'vue'
import { themeOverrides } from '~/config/theme'

const { system, store } = useColorMode()

const isDark = computed(() => {
  return store.value === 'dark' || (store.value === 'auto' && system.value === 'dark')
})

const themeName = computed(() => {
  return store.value === 'auto' ? system.value : store.value
})

const theme = computed(() => {
  if (isDark.value) {
    return darkTheme
  }

  return { name: themeName.value }
})

const locale = ref<NLocale | null>(zhCN)
const dateLocale = ref<NDateLocale | null>(dateZhCN)
</script>
