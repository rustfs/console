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
          <div v-if="loading" class="text-center py-8">
            <n-spin size="large" />
          </div>
          
          <div v-else-if="error" class="text-center py-8">
            <n-alert type="error" :title="t('Failed to load license')">
              {{ error }}
            </n-alert>
          </div>
          
          <div v-else class="license-content">
            <pre class="whitespace-pre-wrap font-mono text-sm leading-6 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg overflow-auto">{{ licenseContent }}</pre>
          </div>
        </article>
      </n-card>
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const loading = ref(true)
const error = ref('')
const licenseContent = ref('')

onMounted(async () => {
  try {
    // 从public目录读取LICENSE文件
    const response = await fetch('/LICENSE')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    licenseContent.value = await response.text()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.license-content {
  line-height: 1.6;
}
</style>