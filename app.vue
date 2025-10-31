<template>
  <Body
    class="bg-background overscroll-none font-sans antialiased"
    :class="[activeTheme ? `theme-${activeTheme}` : '', isScaled ? 'theme-scaled' : '']"
  >
    <ProvidersAppUiProvider>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </ProvidersAppUiProvider>
  </Body>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const activeTheme = useCookie<string>('active_theme', { readonly: true })
const isScaled = computed(() => !!activeTheme.value?.endsWith('-scaled'))
</script>
