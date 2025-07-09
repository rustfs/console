<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { configManager } from '~/utils/config'

const { t } = useI18n()
const message = useMessage()

// 服务端配置
const serverConfig = ref({
  protocol: 'http',
  host: 'localhost',
  port: '9000',
  region: 'us-east-1'
})

// 加载当前配置
const loadCurrentConfig = async () => {
  const currentConfig = await configManager.loadConfig()
  if (currentConfig) {
    const serverConfigData = configManager.extractServerConfig(currentConfig)
    if (serverConfigData) {
      serverConfig.value = serverConfigData
    }
  }
}

// 保存配置
const saveConfig = async () => {
  const saved = await configManager.saveConfig(serverConfig.value)
  if (saved) {
    message.success(t('Server configuration saved'))
  } else {
    message.info(t('Using public configuration, cannot save to localStorage'))
  }
}

// 清除配置
const clearConfig = async () => {
  configManager.clearConfig()
  message.success('Configuration cleared')
  await loadCurrentConfig()
}

// 页面加载时读取当前配置
onMounted(async () => {
  await loadCurrentConfig()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          {{ t('Server Configuration') }}
        </h1>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('Protocol') }}
              </label>
              <n-select v-model:value="serverConfig.protocol" :options="[
                { label: 'HTTP', value: 'http' },
                { label: 'HTTPS', value: 'https' }
              ]" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('Port') }}
              </label>
              <n-input v-model:value="serverConfig.port" type="text" :placeholder="'9000'" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ t('Host') }}
            </label>
            <n-input v-model:value="serverConfig.host" type="text" :placeholder="'localhost'" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ t('Region') }}
            </label>
            <n-input v-model:value="serverConfig.region" type="text" :placeholder="'us-east-1'" />
          </div>

          <div class="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ t('Generated Configuration') }}
            </h3>
            <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div><strong>API URL:</strong> {{ serverConfig.protocol }}://{{ serverConfig.host }}:{{ serverConfig.port }}/rustfs/admin/v3</div>
              <div><strong>S3 Endpoint:</strong> {{ serverConfig.protocol }}://{{ serverConfig.host }}:{{ serverConfig.port }}</div>
              <div><strong>Region:</strong> {{ serverConfig.region }}</div>
            </div>
          </div>

          <div class="flex gap-4 pt-4">
            <n-button type="primary" @click="saveConfig">
              {{ t('Save Configuration') }}
            </n-button>
            <n-button @click="clearConfig">
              {{ t('Clear Configuration') }}
            </n-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
