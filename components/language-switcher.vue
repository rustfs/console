<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost">
        <Icon :name="currentLanguage.icon" class="h-4 w-4 shrink-0" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="w-40" align="start">
      <DropdownMenuItem v-for="option in options" :key="option.key" @select="() => handleSelect(option.key)">
        {{ option.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, setLocale } = useI18n()

const languageConfig = {
  en: { text: 'English', icon: 'ri:translate' },
  zh: { text: '中文', icon: 'ri:translate-2' },
  fr: { text: 'Français', icon: 'ri:translate' },
  tr: { text: 'Türkçe', icon: 'ri:translate' },
  // 以下语言包尚未翻译，暂时隐藏
  // ja: { text: '日本語', icon: 'ri:translate' },
  // ko: { text: '한국어', icon: 'ri:translate' },
  // de: { text: 'Deutsch', icon: 'ri:translate' },
  // es: { text: 'Español', icon: 'ri:translate' },
  // pt: { text: 'Português', icon: 'ri:translate' },
  // it: { text: 'Italiano', icon: 'ri:translate' },
  // ru: { text: 'Русский', icon: 'ri:translate' },
} as const

const options = [
  { label: 'English', key: 'en' },
  { label: '中文', key: 'zh' },
  { label: 'Français', key: 'fr' },
  { label: 'Türkçe', key: 'tr' },
]

const currentLanguage = computed(() => {
  return languageConfig[locale.value as keyof typeof languageConfig] || languageConfig.en
})

const handleSelect = async (key: string) => {
  await setLocale(key as 'en' | 'zh' | 'fr' | 'tr')
}
</script>
