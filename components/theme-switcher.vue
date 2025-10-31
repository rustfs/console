<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost">
        <Icon :name="themeIcon" class="h-4 w-4 shrink-0" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="w-40" align="start">
      <DropdownMenuItem v-for="option in themeOptions" :key="option.key" @select="() => handleSelect(option.key)">
        <Icon :name="option.icon" class="mr-2 h-4 w-4" />
        {{ option.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useColorMode } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { store } = useColorMode()

const themeName = computed(() => {
  switch (store.value) {
    case 'dark':
      return 'Dark'
    case 'light':
      return 'Light'
    default:
      return 'Auto'
  }
})

const themeIcon = computed(() => {
  switch (store.value) {
    case 'dark':
      return 'ri:moon-fill'
    case 'light':
      return 'ri:sun-fill'
    default:
      return 'ri:contrast-2-line'
  }
})

const themeOptions = computed(() => [
  { label: t('Light'), key: 'light', icon: 'ri:sun-fill' },
  { label: t('Dark'), key: 'dark', icon: 'ri:moon-fill' },
  { label: t('Auto'), key: 'auto', icon: 'ri:contrast-2-line' },
])

const handleSelect = (key: string) => {
  if (key === 'light' || key === 'dark' || key === 'auto') {
    store.value = key
  }
}
</script>
