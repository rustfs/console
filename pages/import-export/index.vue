<template>
  <page>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Import/Export') }}</h1>
      </template>
    </page-header>

    <div class="flex flex-col gap-6">
      <Tabs v-model="activeTab" class="flex flex-col gap-6">
        <TabsList class="w-full justify-start overflow-x-auto">
          <TabsTrigger
            v-for="tab in tabs"
            :key="tab.key"
            :value="tab.key"
            class="capitalize"
          >
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="iam" class="mt-0">
          <div class="space-y-6">
            <div class="space-y-6">
              <div class="space-y-2">
                <h2 class="text-lg font-semibold">{{ t('IAM Configuration Export') }}</h2>
                <p class="text-sm text-muted-foreground">
                  {{
                    t(
                      'Export all IAM configurations including users, groups, policies, and access keys in a ZIP file.'
                    )
                  }}
                </p>
              </div>

              <div class="grid gap-3 md:grid-cols-2">
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon name="ri:user-line" class="text-blue-500" />
                  <span>{{ t('Users') }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon name="ri:group-line" class="text-green-500" />
                  <span>{{ t('User Groups') }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon name="ri:shield-line" class="text-purple-500" />
                  <span>{{ t('IAM Policies') }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon name="ri:key-line" class="text-orange-500" />
                  <span>{{ t('AK/SK') }}</span>
                </div>
              </div>

              <Alert>
                <Icon name="ri:information-line" class="h-4 w-4" />
                <AlertTitle>{{ t('Notice') }}</AlertTitle>
                <AlertDescription>
                  {{ t('The exported file contains sensitive information. Please keep it secure.') }}
                </AlertDescription>
              </Alert>

              <div class="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 class="text-sm font-semibold">{{ t('Export IAM Configuration') }}</h3>
                  <p class="text-xs text-muted-foreground">
                    {{ t('Download complete IAM configuration as ZIP file') }}
                  </p>
                </div>
                <Button variant="default" size="lg" :loading="isLoading" :disabled="isLoading" @click="handleExportIam">
                  <Icon name="ri:download-2-line" class="size-4" />
                  <span>{{ isLoading ? t('Exporting...') : t('Export Now') }}</span>
                </Button>
              </div>
            </div>

            <div class="space-y-6">
              <div class="space-y-2">
                <h2 class="text-lg font-semibold">{{ t('IAM Configuration Import') }}</h2>
                <p class="text-sm text-muted-foreground">
                  {{ t('Import IAM configurations from a previously exported ZIP file.') }}
                </p>
              </div>

              <div class="space-y-4">
                <div class="space-y-3">
                  <h3 class="text-sm font-medium">{{ t('Select ZIP File') }}</h3>
                  <AppUploadZone :accept="'.zip'" :disabled="isLoading" @change="handleFileSelect">
                    <p class="text-base font-medium">{{ t('Click or drag ZIP file to this area to upload') }}</p>
                    <p class="text-sm text-muted-foreground">
                      {{ t('Only ZIP files are supported, and file size should not exceed 10MB') }}
                    </p>
                  </AppUploadZone>
                  <p v-if="uploadError" class="text-sm text-destructive">{{ uploadError }}</p>
                  <div v-if="selectedFile" class="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p class="text-sm font-medium">{{ selectedFile.name }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ formatSize(selectedFile.size) }}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" class="text-destructive" @click="clearSelectedFile">
                      <Icon name="ri:close-line" class="size-4" />
                    </Button>
                  </div>
                </div>

                <div class="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 class="text-sm font-semibold">{{ t('Import IAM Configuration') }}</h3>
                    <p class="text-xs text-muted-foreground">
                      {{
                        selectedFile
                          ? t('Ready to import: {filename}', { filename: selectedFile.name })
                          : t('Please select a ZIP file to import')
                      }}
                    </p>
                  </div>
                  <Button variant="default" size="lg" :loading="isLoading" :disabled="isLoading || !selectedFile" @click="handleImportIam">
                    <Icon name="ri:upload-2-line" class="size-4" />
                    <span>{{ isLoading ? t('Importing...') : t('Import Now') }}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </page>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import { AppUploadZone } from '@/components/app'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()

definePageMeta({
  title: 'Import/Export',
})

const { isLoading, exportIamConfig, importIamConfig } = useImportExport()

const activeTab = ref('iam')
const tabs = computed(() => [{ key: 'iam', label: t('IAM') }])

const selectedFile = ref<File | null>(null)
const uploadError = ref('')

const MAX_SIZE = 10 * 1024 * 1024

const clearSelectedFile = () => {
  selectedFile.value = null
  uploadError.value = ''
}

const validateFile = (file: File | null) => {
  if (!file) return false
  if (!file.name.toLowerCase().endsWith('.zip')) {
    uploadError.value = t('Only ZIP files are supported, and file size should not exceed 10MB')
    return false
  }
  if (file.size > MAX_SIZE) {
    uploadError.value = t('File size exceeds limit (10MB)')
    return false
  }
  uploadError.value = ''
  return true
}

const handleFileSelect = (file: File | null) => {
  if (!file) {
    clearSelectedFile()
    return
  }
  if (validateFile(file)) {
    selectedFile.value = file
  } else {
    selectedFile.value = null
  }
}

const handleExportIam = async () => {
  try {
    await exportIamConfig()
  } catch (error) {
    console.error('Export failed:', error)
  }
}

const handleImportIam = async () => {
  if (!selectedFile.value) return
  try {
    await importIamConfig(selectedFile.value)
    message.success(t('Import Success'))
    clearSelectedFile()
  } catch (error) {
    console.error('Import failed:', error)
  }
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = -1
  do {
    size /= 1024
    unitIndex++
  } while (size >= 1024 && unitIndex < units.length - 1)
  return `${size.toFixed(1)} ${units[unitIndex]}`
}
</script>
