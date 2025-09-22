<template>
  <div :class="isDark ? 'dark' : ''">
    <n-config-provider :theme="theme" :locale="naiveLocale" :theme-overrides="themeOverrides" :date-locale="dateLocale">
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
import { useColorMode } from '@vueuse/core';
import { darkTheme, dateZhCN, enUS, zhCN } from 'naive-ui';
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { themeOverrides } from '~/config/theme';

const { system, store } = useColorMode();
const { locale } = useI18n();

const isDark = computed(() => {
  return store.value === 'dark' || (store.value === 'auto' && system.value === 'dark');
});

const themeName = computed(() => {
  return store.value === 'auto' ? system.value : store.value;
});

const theme = computed(() => {
  if (isDark.value) {
    return darkTheme;
  }

  return { name: themeName.value };
});

const naiveLocale = computed(() => {
  // 安全地比较locale的值，避免TypeScript类型错误
  const currentLocale = locale.value.toString();
  return currentLocale === 'zh-CN' || currentLocale === 'zh' ? zhCN : enUS;
});

const dateLocale = computed(() => {
  // 安全地比较locale的值，避免TypeScript类型错误
  const currentLocale = locale.value.toString();
  return currentLocale === 'zh-CN' || currentLocale === 'zh' ? dateZhCN : null;
});

// 监听语言变化
watch(locale, newLocale => {
  console.log('Language changed to:', newLocale);
});
</script>
