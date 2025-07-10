<template>
  <div class="license-article">
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('License') }}</h1>
      </template>
    </page-header>

    <page-content>
      <n-card size="large">
        <template #header>
          <h1 class="text-2xl font-bold text-center">{{ t('Apache License') }}</h1>
        </template>

        <article class="max-w-4xl mx-auto">
          <div class="license-content">
            <pre class="whitespace-pre-wrap font-mono text-sm leading-6 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg overflow-auto">{{ licenseContent }}</pre>
          </div>
        </article>
      </n-card>
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import licenseText from '~/LICENSE?raw'

const { t } = useI18n()
const licenseContent = licenseText
</script>

<style scoped>
.license-content {
  line-height: 1.6;
}
</style>
