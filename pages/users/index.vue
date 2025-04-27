<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Users') }}</h1>
      </template>
    </page-header>
    <page-content>
      <n-tabs type="card">
        <n-tab-pane name="users" :tab="t('Users')">
          <users-tabs-user></users-tabs-user>
        </n-tab-pane>
        <n-tab-pane name="userGroup" :tab="t('User Groups')">
          <users-tabs-group></users-tabs-group>
        </n-tab-pane>
      </n-tabs>
    </page-content>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style lang="scss" scoped></style>
