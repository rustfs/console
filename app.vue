<template>
  <div :class="theme.name === darkTheme.name ? 'dark' : ''">
    <n-config-provider
      :theme="theme"
      :locale="locale"
      :date-locale="dateLocale">
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
import {
  darkTheme,
  type GlobalTheme,
  type NDateLocale,
  type NLocale
} from 'naive-ui'
import { dateZhCN, zhCN } from 'naive-ui'
import { ref } from 'vue'

const theme = ref<GlobalTheme | null>(darkTheme)
const locale = ref<NLocale | null>(zhCN)
const dateLocale = ref<NDateLocale | null>(dateZhCN)
</script>
