<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Import/Export') }}</h1>
    </page-header>

    <div class="flex flex-col gap-6">
      <Tabs v-model="activeTab" class="flex flex-col gap-6">
        <TabsList class="w-full justify-start overflow-x-auto">
          <TabsTrigger v-for="tab in tabs" :key="tab.key" :value="tab.key" class="capitalize">
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" class="mt-0">
          <Card class="shadow-none">
            <CardHeader class="space-y-1">
              <CardTitle>{{ t('IAM Configuration Export') }}</CardTitle>
              <CardDescription>
                {{
                  t('Export all IAM configurations including users, groups, policies, and access keys in a ZIP file.')
                }}
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid gap-4 sm:grid-cols-2">
                <div
                  v-for="item in exportHighlights"
                  :key="item.label"
                  class="flex items-center gap-3 rounded-md border bg-muted/40 p-3"
                >
                  <Icon :name="item.icon" :class="item.iconClass" class="size-5" />
                  <span class="text-sm font-medium text-foreground">{{ t(item.label) }}</span>
                </div>
              </div>

              <Alert>
                <Icon name="ri:information-line" class="h-4 w-4" />
                <AlertTitle>{{ t('Notice') }}</AlertTitle>
                <AlertDescription>
                  {{ t('The exported file contains sensitive information. Please keep it secure.') }}
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-sm text-muted-foreground">
                {{ t('Download complete IAM configuration as ZIP file') }}
              </div>
              <Button variant="default" size="lg" :loading="isLoading" :disabled="isLoading" @click="handleExportIam">
                <Icon name="ri:download-2-line" class="size-4" />
                <span>{{ isLoading ? t('Exporting...') : t('Export Now') }}</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="import" class="mt-0">
          <Card class="shadow-none">
            <CardHeader class="space-y-1">
              <CardTitle>{{ t('IAM Configuration Import') }}</CardTitle>
              <CardDescription>
                {{ t('Import IAM configurations from a previously exported ZIP file.') }}
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-3">
                <UploadZone :accept="'.zip'" :disabled="isLoading" class="border-dashed" @change="handleFileSelect">
                  <p class="text-base font-medium">{{ t('Click or drag ZIP file to this area to upload') }}</p>
                  <p class="text-sm text-muted-foreground">
                    {{ t('Only ZIP files are supported, and file size should not exceed 10MB') }}
                  </p>
                </UploadZone>
                <p v-if="uploadError" class="text-sm text-destructive">{{ uploadError }}</p>

                <Card v-if="selectedFile" class="border-dashed bg-muted/30 shadow-none">
                  <CardContent class="flex items-start justify-between gap-3 py-4">
                    <div>
                      <p class="text-sm font-medium text-foreground">{{ selectedFile.name }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ formatSize(selectedFile.size) }}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" class="text-destructive" @click="clearSelectedFile">
                      <Icon name="ri:close-line" class="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
            <CardFooter class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-sm text-muted-foreground">
                {{
                  selectedFile
                    ? t('Ready to import: {filename}', { filename: selectedFile.name })
                    : t('Please select a ZIP file to import')
                }}
              </div>
              <Button
                variant="default"
                size="lg"
                :loading="isLoading"
                :disabled="isLoading || !selectedFile"
                @click="handleImportIam"
              >
                <Icon name="ri:upload-2-line" class="size-4" />
                <span>{{ isLoading ? t('Importing...') : t('Import Now') }}</span>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </page>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import UploadZone from '@/components/upload-zone.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()

definePageMeta({
  title: 'Import/Export',
})

const { isLoading, exportIamConfig, importIamConfig } = useImportExport()

const activeTab = ref<'export' | 'import'>('export')
const tabs = computed(() => [
  { key: 'export', label: t('Export') },
  { key: 'import', label: t('Import') },
])
const exportHighlights = computed(() => [
  { label: 'Users', icon: 'ri:user-line', iconClass: 'text-blue-500' },
  { label: 'User Groups', icon: 'ri:group-line', iconClass: 'text-green-500' },
  { label: 'IAM Policies', icon: 'ri:shield-line', iconClass: 'text-purple-500' },
  { label: 'AK/SK', icon: 'ri:key-line', iconClass: 'text-orange-500' },
])

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
