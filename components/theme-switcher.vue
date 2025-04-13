<script lang="ts" setup>
import { Icon } from '#components'

import { useColorMode, useCycleList } from '@vueuse/core'
import { watchEffect } from 'vue'

const mode = useColorMode({
  emitAuto: true,
})

const { state, next } = useCycleList(['dark', 'light', 'auto'] as const, { initialValue: mode })

watchEffect(() => mode.value = state.value)

const icons =
{
  'dark': 'ri:moon-clear-fill',
  'light': 'ri:sun-fill',
  'auto': 'ri:computer-fill'
}

const switchTheme = () => {
  next();
  mode.value = state.value === "dark" ? "dark" : "light"
}
</script>

<template>
  <n-button type="default" @click="switchTheme" class="theme-switcher">
    <template #icon>
      <n-icon>
        <Icon :name="icons[state]" />
      </n-icon>
    </template>
  </n-button>
</template>
