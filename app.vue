<template>

  <Body class="bg-background overscroll-none font-sans antialiased" :class="[
    activeTheme ? `theme-${activeTheme}` : '',
    isScaled ? 'theme-scaled' : '',
  ]">
    <ProvidersAppUiProvider>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </ProvidersAppUiProvider>

    <Toaster :theme="colorMode as any || 'system'" />
  </Body>
</template>

<script lang="ts" setup>
import { useColorMode } from '@vueuse/core'
import { computed } from 'vue'

import { Toaster } from '@/components/ui/sonner'
const activeTheme = useCookie<string>('active_theme', { readonly: true })
const isScaled = computed(() => !!activeTheme.value?.endsWith('-scaled'))
const colorMode = useColorMode()
</script>
