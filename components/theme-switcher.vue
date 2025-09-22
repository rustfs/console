<template>
  <n-dropdown :options="themeOptions" trigger="click" @select="handleSelect">
    <n-button :text="true" block>
      <template #icon>
        <Icon :name="themeIcon" />
      </template>
      {{ t(themeName) }}
    </n-button>
  </n-dropdown>
</template>

<script setup lang="ts">
import { Icon } from '#components';
import { useColorMode } from '@vueuse/core';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { store } = useColorMode();

const themeName = computed(() => {
  switch (store.value) {
    case 'dark':
      return 'Dark';
    case 'light':
      return 'Light';
    default:
      return 'Auto';
  }
});

const themeIcon = computed(() => {
  switch (store.value) {
    case 'dark':
      return 'ri:moon-fill';
    case 'light':
      return 'ri:sun-fill';
    default:
      return 'ri:contrast-2-line';
  }
});

const themeOptions = [
  {
    label: () =>
      h('div', { class: 'flex items-center' }, [h(Icon, { name: 'ri:sun-fill', class: 'mr-2' }), t('Light')]),
    key: 'light',
  },
  {
    label: () =>
      h('div', { class: 'flex items-center' }, [h(Icon, { name: 'ri:moon-fill', class: 'mr-2' }), t('Dark')]),
    key: 'dark',
  },
  {
    label: () =>
      h('div', { class: 'flex items-center' }, [h(Icon, { name: 'ri:contrast-2-line', class: 'mr-2' }), t('Auto')]),
    key: 'auto',
  },
];

const handleSelect = (key: string) => {
  if (key === 'light' || key === 'dark' || key === 'auto') {
    store.value = key;
  }
};
</script>
