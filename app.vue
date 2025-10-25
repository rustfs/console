<template>
  <div class="min-h-screen" :class="{ dark: isDark }">
    <AppUiProvider>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </AppUiProvider>
  </div>
</template>

<script lang="ts" setup>
import AppUiProvider from '@/components/providers/AppUiProvider.vue';
import { useColorMode } from '@vueuse/core';
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { system, store } = useColorMode();
const { locale } = useI18n();

const isDark = computed(() => {
  return store.value === 'dark' || (store.value === 'auto' && system.value === 'dark');
});

// 监听语言变化
watch(locale, newLocale => {
  console.log('Language changed to:', newLocale);
});
</script>
