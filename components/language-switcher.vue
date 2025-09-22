<template>
  <n-dropdown :options="options" trigger="click" @select="handleSelect">
    <n-button :text="true" block>
      <template #icon>
        <Icon :name="currentLanguage.icon" />
      </template>
      {{ currentLanguage.text }}
    </n-button>
  </n-dropdown>
</template>

<script setup lang="ts">
import { Icon } from '#components';
import type { DropdownOption } from 'naive-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale, setLocale } = useI18n();

const languageConfig = {
  en: { text: 'English', icon: 'ri:translate' },
  zh: { text: '中文', icon: 'ri:translate-2' },
  tr: { text: 'Türkçe', icon: 'ri:translate' },
} as const;

const currentLanguage = computed(() => {
  return languageConfig[locale.value as keyof typeof languageConfig] || languageConfig.en;
});

const options = ref<DropdownOption[]>([
  {
    label: 'English',
    key: 'en',
  },
  {
    label: '中文',
    key: 'zh',
  },
  {
    label: 'Türkçe',
    key: 'tr',
  },
]);

const handleSelect = async (key: string) => {
  await setLocale(key as 'en' | 'zh' | 'tr');
};
</script>

<style scoped>
.language-switcher {
  display: inline-block;
}

.language-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  outline: none;
}

.language-select:hover {
  border-color: #999;
}
</style>
