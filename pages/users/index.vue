<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Users') }}</h1>
      </template>
    </page-header>
    <page-content>
      <AppTabs :tabs="tabs" v-model="activeTab">
        <template #users>
          <users-tabs-user />
        </template>
        <template #userGroup>
          <users-tabs-group />
        </template>
      </AppTabs>
    </page-content>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { ref, computed } from 'vue';
import { AppTabs } from '@/components/app';

const { t } = useI18n();
const activeTab = ref('users');

const tabs = computed(() => [
  { key: 'users', label: t('Users') },
  { key: 'userGroup', label: t('User Groups') },
]);
</script>

<style lang="scss" scoped></style>
