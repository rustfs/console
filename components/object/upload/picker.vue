<template>
  <AppModal v-model="visible" :title="t('Upload File')" size="xl" :close-on-backdrop="false">
    <div class="space-y-5">
      <input ref="fileInput" type="file" multiple class="hidden" @change="handleFileSelect" />
      <input
        ref="folderInput"
        type="file"
        webkitdirectory
        directory
        class="hidden"
        @change="handleFolderSelect"
      />

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <p class="text-sm font-medium text-muted-foreground">
            {{ t('Target Bucket') }}: {{ bucketName }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ t('Current Prefix') }}: {{ prefix || '/' }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AppButton variant="outline" size="sm" :disabled="isFolderLoading" @click="selectFile">
            <Icon name="ri:file-add-line" class="size-4" />
            {{ t('Select File') }}
          </AppButton>
          <AppButton variant="outline" size="sm" :disabled="isFolderLoading" @click="selectFolder">
            <Icon name="ri:folder-add-line" class="size-4" />
            {{ t('Select Folder') }}
          </AppButton>
          <AppButton variant="secondary" size="sm" @click="closeModal">
            <Icon name="ri:close-line" class="size-4" />
            {{ t('Close') }}
          </AppButton>
        </div>
      </div>

      <Alert class="border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
        <AlertDescription>
          {{ t('Overwrite Warning') }}
        </AlertDescription>
      </Alert>

      <Alert
        v-if="isMemoryWarning"
        class="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
      >
        <AlertDescription>
          {{ t('Large File Count Warning', { count: totalFileCount.toLocaleString(), max: MAX_FILES_LIMIT }) }}
        </AlertDescription>
      </Alert>

      <AppCard padded class="space-y-4 border border-border/60">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1 text-sm text-muted-foreground">
            <p v-if="totalFileCount > 0">
              {{ t('Total Files') }}: {{ totalFileCount.toLocaleString() }}
            </p>
            <p v-if="totalFileCount > 0">
              {{ t('Memory Usage') }}: {{ getMemoryUsageLevel() }}
            </p>
          </div>
          <AppButton
            variant="outline"
            size="sm"
            :disabled="!hasFiles || isFolderLoading || isAdding"
            @click="clearAllFiles"
          >
            <Icon name="ri:delete-bin-line" class="size-4" />
            {{ t('Clear All') }}
          </AppButton>
        </div>

        <div
          class="rounded-md border border-dashed border-border/60 transition"
          :class="isDragOver ? 'border-primary bg-primary/5' : ''"
          @dragenter.prevent="handleDragEnter"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <div
            v-if="!selectedItems.length"
            class="flex h-[42vh] flex-col items-center justify-center gap-4 p-6 text-center"
          >
            <Icon name="ri:cloud-upload-line" class="size-10 text-muted-foreground" />
            <p class="text-base font-medium text-muted-foreground">{{ t('No Selection') }}</p>
            <p class="max-w-[320px] text-sm text-muted-foreground">
              {{ t('Drag Drop Info') }}<br />
              {{ t('File Size Limit') }}
            </p>
          </div>
          <div v-else class="max-h-[42vh] overflow-auto">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th class="px-3 py-2 text-left font-medium">
                    {{ t('Name') }}
                  </th>
                  <th class="px-3 py-2 text-left font-medium">
                    {{ t('Size') }}
                  </th>
                  <th class="px-3 py-2 text-right font-medium">
                    {{ t('Actions') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in selectedItems" :key="item.uid" class="border-b last:border-b-0">
                  <td class="px-3 py-2">
                    <div class="flex items-start gap-2">
                      <Icon
                        :name="item.type === 'folder' ? 'ri:folder-3-line' : 'ri:file-line'"
                        class="mt-0.5 size-4 text-muted-foreground"
                      />
                      <div>
                        <div class="font-medium text-foreground">
                          {{ item.name }}<span v-if="item.type === 'folder'">/</span>
                        </div>
                        <div v-if="item.type === 'folder' && item.fileCount" class="text-xs text-muted-foreground">
                          {{ item.fileCount.toLocaleString() }} {{ t('Files') }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-2 text-sm text-muted-foreground">
                    {{ formatBytes(item.size) }}
                  </td>
                  <td class="px-3 py-2 text-right">
                    <AppButton variant="ghost" size="sm" class="h-auto px-2" @click="removeItem(index)">
                      <Icon name="ri:delete-bin-line" class="size-4" />
                      {{ t('Delete') }}
                    </AppButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="isFolderLoading" class="space-y-2 rounded-md border border-dashed border-border/60 p-3">
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>{{ t('Reading Folder Files') }}</span>
            <span>{{ folderLoadingProgress }}%</span>
          </div>
          <AppProgress :value="folderLoadingProgress" :processing="true" />
        </div>

        <div v-if="isAdding" class="space-y-2 rounded-md border border-dashed border-border/60 p-3">
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>{{ t('Adding to Upload Queue') }}</span>
            <span>{{ addProgress }}%</span>
          </div>
          <AppProgress :value="addProgress" :processing="true" />
        </div>
      </AppCard>

      <div class="flex justify-end gap-2">
        <AppButton variant="outline" :disabled="!hasFiles || isAdding || isFolderLoading">
          {{ t('Configure') }}
        </AppButton>
        <AppButton
          variant="primary"
          :disabled="!hasFiles || isAdding || isFolderLoading"
          :loading="isAdding"
          @click="handleUpload"
        >
          {{ t('Start Upload') }}
        </AppButton>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { AppButton, AppCard, AppModal, AppProgress } from '@/components/app'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUploadTaskManagerStore } from '~/store/upload-tasks'

const props = defineProps<{
  show: boolean
  bucketName: string
  prefix: string
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'submit'): void
}>()

interface FileItem {
  file: File
  prefix: string
}

interface SelectedItem {
  uid: string
  type: 'file' | 'folder'
  name: string
  size: number
  fileCount?: number
  files: FileItem[]
}

interface OptimizedFileGroup {
  files: File[]
  totalSize: number
  fileCount: number
}

const { t } = useI18n()
const message = useMessage()
const uploadTaskManagerStore = useUploadTaskManagerStore()

const visible = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})

const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)

const selectedItems = ref<SelectedItem[]>([])
const isMemoryWarning = ref(false)
const totalFileCount = ref(0)
const isFolderLoading = ref(false)
const folderLoadingProgress = ref(0)
const isAdding = ref(false)
const addProgress = ref(0)
const isDragOver = ref(false)

const MAX_FILES_LIMIT = 10_000
const MEMORY_WARNING_THRESHOLD = 5_000

const hasFiles = computed(() => selectedItems.value.length > 0)
const allFiles = computed(() => selectedItems.value.flatMap(item => item.files))

const selectFile = () => fileInput.value?.click()
const selectFolder = () => folderInput.value?.click()

const clearAllFiles = () => {
  selectedItems.value = []
  totalFileCount.value = 0
  isMemoryWarning.value = false
  addProgress.value = 0
  folderLoadingProgress.value = 0

  if (typeof window !== 'undefined' && 'gc' in window && typeof (window as any).gc === 'function') {
    try {
      ;(window as any).gc()
    } catch {
      // ignore
    }
  }
}

const closeModal = () => {
  clearAllFiles()
  emit('update:show', false)
}

const createUid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const ensureCapacity = (incoming: number) => {
  const nextTotal = totalFileCount.value + incoming
  if (nextTotal > MAX_FILES_LIMIT) {
    message.error(
      t('File Count Limit Exceeded', {
        current: nextTotal.toLocaleString(),
        max: MAX_FILES_LIMIT.toLocaleString(),
      })
    )
    return false
  }

  if (nextTotal > MEMORY_WARNING_THRESHOLD && !isMemoryWarning.value) {
    isMemoryWarning.value = true
    message.warning(
      t('Memory Warning', {
        count: nextTotal.toLocaleString(),
        threshold: MEMORY_WARNING_THRESHOLD.toLocaleString(),
      })
    )
  }

  totalFileCount.value = nextTotal
  return true
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (!files.length) return

  if (!ensureCapacity(files.length)) {
    input.value = ''
    return
  }

  const items = files.map(file => ({
    uid: createUid(),
    type: 'file' as const,
    name: file.name,
    size: file.size,
    files: [{ file, prefix: props.prefix }],
  }))

  selectedItems.value.push(...items)
  setTimeout(checkMemoryUsage, 500)
  input.value = ''
}

const handleFolderSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (!files.length) return

  const nextTotal = totalFileCount.value + files.length
  if (nextTotal > MAX_FILES_LIMIT) {
    message.error(
      t('File Count Limit Exceeded', {
        current: nextTotal.toLocaleString(),
        max: MAX_FILES_LIMIT.toLocaleString(),
      })
    )
    input.value = ''
    return
  }

  if (nextTotal > MEMORY_WARNING_THRESHOLD && !isMemoryWarning.value) {
    isMemoryWarning.value = true
    message.warning(
      t('Memory Warning', {
        count: nextTotal.toLocaleString(),
        threshold: MEMORY_WARNING_THRESHOLD.toLocaleString(),
      })
    )
  }

  isFolderLoading.value = true
  folderLoadingProgress.value = 0

  try {
    const folderMap = new Map<string, OptimizedFileGroup>()
    const batchSize = 200

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)

      for (const file of batch) {
        const pathParts = file.webkitRelativePath.split('/')
        pathParts.pop()
        const folderPath = pathParts.join('/') || t('Unknown Folder')

        if (!folderMap.has(folderPath)) {
          folderMap.set(folderPath, { files: [], totalSize: 0, fileCount: 0 })
        }

        const group = folderMap.get(folderPath)!
        group.files.push(file)
        group.totalSize += file.size
        group.fileCount++
      }

      folderLoadingProgress.value = Math.round(((i + batch.length) / files.length) * 100)
      await new Promise(resolve => setTimeout(resolve, 1))
    }

    for (const [folderPath, group] of folderMap.entries()) {
      selectedItems.value.push({
        uid: createUid(),
        type: 'folder',
        name: folderPath,
        size: group.totalSize,
        fileCount: group.fileCount,
        files: group.files.map(file => ({
          file,
          prefix: `${props.prefix}${folderPath ? `${folderPath}/` : ''}`,
        })),
      })
    }

    totalFileCount.value = nextTotal
    setTimeout(checkMemoryUsage, 1000)
  } catch (error) {
    console.error('Failed to process folder:', error)
    message.error(t('Folder Processing Error'))
  } finally {
    isFolderLoading.value = false
    folderLoadingProgress.value = 100
    input.value = ''
  }
}

const handleDragEnter = () => {
  if (!isFolderLoading.value && !isAdding.value) {
    isDragOver.value = true
  }
}

const handleDragOver = () => {
  if (!isFolderLoading.value && !isAdding.value) {
    isDragOver.value = true
  }
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  if (isFolderLoading.value || isAdding.value) return
  isDragOver.value = false

  const droppedFiles = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []
  if (!droppedFiles.length) return

  if (!ensureCapacity(droppedFiles.length)) return

  const items = droppedFiles.map(file => ({
    uid: createUid(),
    type: 'file' as const,
    name: file.name,
    size: file.size,
    files: [{ file, prefix: props.prefix }],
  }))

  selectedItems.value.push(...items)
  setTimeout(checkMemoryUsage, 500)
}

const removeItem = (index: number) => {
  const item = selectedItems.value[index]
  if (!item) return

  if (item.type === 'folder' && item.fileCount) {
    totalFileCount.value = Math.max(0, totalFileCount.value - item.fileCount)
  } else {
    totalFileCount.value = Math.max(0, totalFileCount.value - 1)
  }

  selectedItems.value.splice(index, 1)

  if (totalFileCount.value <= MEMORY_WARNING_THRESHOLD) {
    isMemoryWarning.value = false
  }
}

const handleUpload = async () => {
  const filesToUpload = allFiles.value
  if (!filesToUpload.length) return

  isAdding.value = true
  addProgress.value = 0

  try {
    const groups = new Map<
      string,
      {
        bucket: string
        prefix: string
        files: File[]
      }
    >()

    filesToUpload.forEach(item => {
      const prefix = item.prefix ?? ''
      const key = JSON.stringify([props.bucketName, prefix])
      if (!groups.has(key)) {
        groups.set(key, { bucket: props.bucketName, prefix, files: [] })
      }
      groups.get(key)!.files.push(item.file)
    })

    const totals = Array.from(groups.values()).reduce((sum, group) => sum + group.files.length, 0)
    let processed = 0

    for (const group of groups.values()) {
      const { bucket, prefix, files } = group

      for (let i = 0; i < files.length; i += 50) {
        const batch = files.slice(i, i + 50)
        await new Promise(resolve => setTimeout(resolve, 0))
        await Promise.resolve(uploadTaskManagerStore.addFiles(batch, bucket, prefix))
        processed += batch.length
        addProgress.value = Math.round((processed / totals) * 100)
      }
    }

    emit('submit')
    closeModal()
  } catch (error) {
    console.error('Failed to enqueue upload tasks:', error)
    message.error(t('Add Failed'))
  } finally {
    isAdding.value = false
  }
}

const checkMemoryUsage = () => {
  if (typeof performance === 'undefined' || !('memory' in performance)) return

  const memInfo = (performance as any).memory
  if (!memInfo) return

  const usedMB = memInfo.usedJSHeapSize / 1024 / 1024
  if (usedMB > 100 && totalFileCount.value > MEMORY_WARNING_THRESHOLD) {
    message.warning(
      t('High Memory Usage Warning', {
        memory: Math.round(usedMB),
        files: totalFileCount.value.toLocaleString(),
      })
    )
  }
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

const getMemoryUsageLevel = () => {
  const count = totalFileCount.value
  if (count < 1_000) return t('Memory Low')
  if (count < MEMORY_WARNING_THRESHOLD) return t('Memory Medium')
  if (count < MAX_FILES_LIMIT) return t('Memory High')
  return t('Memory Critical')
}

watch(
  () => props.show,
  value => {
    if (!value) {
      clearAllFiles()
      isFolderLoading.value = false
      isAdding.value = false
      isDragOver.value = false
    }
  }
)
</script>
