<script lang="ts" setup>
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { configManager } from '~/utils/config'

const { t } = useI18n()
const message = useMessage()

const currentConfig = ref({
  serverHost: '',
  api: { baseURL: '' },
  s3: { endpoint: '', region: '' },
})

const formData = ref({
  serverHost: '',
})

const loading = ref(false)

const loadCurrentConfig = async () => {
  try {
    const config = await configManager.loadConfig()
    currentConfig.value = config
    formData.value.serverHost = config.serverHost
  } catch (error) {
    message.error(t('Failed to load current configuration'))
  }
}

const saveConfig = async () => {
  if (!formData.value.serverHost) {
    message.error(t('Please enter server address'))
    return
  }

  loading.value = true
  try {
    let urlToValidate = formData.value.serverHost.trim()
    if (!/^https?:\/\//.test(urlToValidate)) {
      urlToValidate = 'https://' + urlToValidate
    }

    const url = new URL(urlToValidate)
    const urlToSave = /^https?:\/\//.test(formData.value.serverHost) ? formData.value.serverHost : urlToValidate

    localStorage.setItem('rustfs-server-host', urlToSave)

    if (!/^https?:\/\//.test(formData.value.serverHost)) {
      formData.value.serverHost = urlToValidate
    }

    configManager.clearCache()
    message.success(t('Configuration saved successfully'))

    setTimeout(() => {
      window.location.reload()
    }, 200)
  } catch (error) {
    message.error(t('Invalid server address format'))
  } finally {
    loading.value = false
  }
}

const resetConfig = async () => {
  localStorage.removeItem('rustfs-server-host')
  configManager.clearCache()
  message.success(t('Configuration reset successfully'))
  setTimeout(() => {
    window.location.reload()
  }, 200)
}

onMounted(() => {
  loadCurrentConfig()
})

const currentItems = computed(() => [
  { label: t('Server Host'), value: currentConfig.value.serverHost || t('Not configured') },
  { label: t('API Base URL'), value: currentConfig.value.api.baseURL || t('Not configured') },
  { label: t('S3 Endpoint'), value: currentConfig.value.s3.endpoint || t('Not configured') },
  { label: t('S3 Region'), value: currentConfig.value.s3.region || t('Not configured') },
])
</script>

<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Settings') }}</h1>
    </page-header>

    <div class="flex flex-col gap-6">
      <div class="space-y-4">
        <h2 class="text-lg font-semibold">{{ t('Current Configuration') }}</h2>
        <dl class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div v-for="item in currentItems" :key="item.label" class="rounded-md border p-3">
            <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {{ item.label }}
            </dt>
            <dd class="mt-1 text-sm">{{ item.value }}</dd>
          </div>
        </dl>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold">{{ t('Server Configuration') }}</h2>
        <form class="space-y-4" @submit.prevent="saveConfig">
          <Field>
            <FieldLabel>{{ t('Server Address') }}</FieldLabel>
            <FieldContent>
              <Input
                v-model="formData.serverHost"
                :placeholder="t('Please enter server address (e.g., http://localhost:9000)')"
                autocomplete="off"
              />
            </FieldContent>
            <FieldDescription>
              {{ t('Example: http://localhost:9000 or https://your-domain.com') }}
            </FieldDescription>
          </Field>

          <div class="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="default" :loading="loading">
              {{ t('Save Configuration') }}
            </Button>
            <Button type="button" variant="outline" @click="resetConfig">
              {{ t('Reset to Default') }}
            </Button>
          </div>
        </form>

        <Alert>
          <AlertTitle>{{ t('Configuration Information') }}</AlertTitle>
          <AlertDescription>
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li>{{ t('Configuration is saved locally in your browser') }}</li>
              <li>{{ t('Page will refresh automatically after saving configuration') }}</li>
              <li>{{ t('Make sure the server address is accessible from your network') }}</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  </page>
</template>
