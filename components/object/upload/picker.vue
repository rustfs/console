<template>
  <n-modal :show="show" @update:show="(val: boolean) => $emit('update:show', val)" size="huge">
    <n-card class="max-w-screen-md">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>{{ t('Upload File') }}</span>
          <n-button size="small" ghost @click="closeModal">{{ t('Close') }}</n-button>
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <input type="file" ref="fileInput" multiple hidden @change="handleFileSelect" />
          <input type="file" ref="folderInput" webkitdirectory directory hidden @change="handleFolderSelect" />
          <n-button type="primary" :disabled="isFolderLoading" @click="selectFile">{{ t('Select File') }}</n-button>
          <div>{{ t('Or') }}</div>
          <n-button :disabled="isFolderLoading" @click="selectFolder">{{ t('Select Folder') }}</n-button>
          <div>{{ t('Upload To') }}</div>
          <div class="text-cyan-600">{{ bucketName }}{{ prefix || '/' }}</div>
        </div>

        <n-alert title="" type="info">
          {{ t('Overwrite Warning') }}
        </n-alert>

        <!-- 内存警告 -->
        <n-alert v-if="isMemoryWarning" title="" type="warning" style="margin-bottom: 16px">
          {{ t('Large File Count Warning', { count: totalFileCount, max: MAX_FILES_LIMIT }) }}
        </n-alert>

        <!-- 文件统计信息 -->
        <div v-if="totalFileCount > 0" class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4 text-sm text-gray-600">
            <span>{{ t('Total Files') }}: {{ totalFileCount.toLocaleString() }}</span>
            <span>{{ t('Memory Usage') }}: {{ getMemoryUsageLevel() }}</span>
          </div>
          <n-button size="small" type="warning" ghost @click="clearAllFiles" :disabled="isFolderLoading || isAdding">
            {{ t('Clear All') }}
          </n-button>
        </div>

        <!-- 文件夹读取 loading -->
        <n-progress v-if="isFolderLoading" :percentage="folderLoadingProgress" type="line" :show-indicator="true" style="margin-bottom: 16px">
          <template #default> {{ t('Reading Folder Files') }} ({{ folderLoadingProgress }}%) </template>
        </n-progress>

        <div @dragover.prevent @drop.prevent="handleDrop">
          <div v-if="selectedItems.length === 0" class="flex flex-col gap-6 items-center justify-center border border-dashed border-muted rounded p-4 h-[40vh]">
            <div class="text-gray-500 font-bold">{{ t('No Selection') }}</div>
            <div class="text-muted-foreground text-center">
              {{ t('Drag Drop Info') }}<br />
              {{ t('File Size Limit') }}
            </div>
          </div>

          <!-- 虚拟滚动文件与文件夹列表 -->
          <n-virtual-list v-if="selectedItems.length" :items="selectedItems" :item-size="60" class="h-[40vh] overflow-y-auto border rounded">
            <template #default="{ item, index }">
              <div class="flex items-center gap-2 w-full border-b p-1">
                <div class="flex-1">
                  <div>
                    <span v-if="item.type === 'folder'">{{ item.name }}/</span>
                    <span v-else>{{ item.name }}</span>
                  </div>
                  <div v-if="item.type === 'folder' && item.fileCount" class="text-xs text-gray-500">
                    {{ item.fileCount }} 个文件
                  </div>
                </div>
                <div class="w-32 text-center">{{ formatBytes(item.size) }}</div>
                <div class="w-32 text-center">
                  <n-button text type="info" @click="removeItem(index)">{{ t('Delete') }}</n-button>
                </div>
              </div>
            </template>
          </n-virtual-list>
        </div>

        <n-progress v-if="isAdding" :percentage="addProgress" type="line" :show-indicator="true" style="margin-bottom: 16px">
          <template #default> {{ t('Adding to Upload Queue') }} ({{ addProgress }}%) </template>
        </n-progress>

        <div class="flex justify-center gap-4">
          <n-button type="default" :disabled="!hasFiles || isAdding || isFolderLoading">{{ t('Configure') }}</n-button>
          <n-button type="primary" :disabled="!hasFiles || isAdding || isFolderLoading" :loading="isAdding" @click="handleUpload">{{
            t('Start Upload')
            }}</n-button>
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { computed, defineEmits, defineProps, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUploadTaskManagerStore } from '~/store/upload-tasks'

const { t } = useI18n()
const message = useMessage()
const uploadTaskManagerStore = useUploadTaskManagerStore()

interface FileItem {
  file: File
  prefix: string
}

interface OptimizedFileGroup {
  files: File[]
  totalSize: number
  fileCount: number
}

interface SelectedItem {
  type: 'file' | 'folder'
  name: string
  size: number
  fileCount?: number
  files?: FileItem[]
}

const emit = defineEmits(['update:show', 'submit'])

const props = defineProps<{ show: boolean; bucketName: string; prefix: string }>()

const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)

// 待上传的文件/文件夹列表
const selectedItems = ref<SelectedItem[]>([])

const isAdding = ref(false)
const addProgress = ref(0)
const isFolderLoading = ref(false)
const folderLoadingProgress = ref(0)

// 内存优化配置
const MAX_FILES_LIMIT = 10000 // 最大文件数限制
const MEMORY_WARNING_THRESHOLD = 5000 // 内存警告阈值
const isMemoryWarning = ref(false)
const totalFileCount = ref(0)

// 清理内存函数
const clearAllFiles = () => {
  selectedItems.value = []
  totalFileCount.value = 0
  isMemoryWarning.value = false

  // 强制垃圾回收（如果支持）
  if (window.gc) {
    window.gc()
  }
}

const closeModal = () => {
  // 关闭时清理内存
  clearAllFiles()
  emit('update:show', false)
}

const selectFile = () => fileInput.value?.click()
const selectFolder = () => folderInput.value?.click()

// 内存监控
const checkMemoryUsage = () => {
  if ('memory' in performance) {
    const memInfo = (performance as any).memory
    const usedMB = memInfo.usedJSHeapSize / 1024 / 1024

    // 如果内存使用超过 100MB 且文件数量很大，建议清理
    if (usedMB > 100 && totalFileCount.value > MEMORY_WARNING_THRESHOLD) {
      message.warning(
        t('High Memory Usage Warning', {
          memory: Math.round(usedMB),
          files: totalFileCount.value
        })
      )
    }
  }
}

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files) {
    const fileCount = input.files.length
    const currentTotal = totalFileCount.value + fileCount

    // 检查文件数量限制
    if (currentTotal > MAX_FILES_LIMIT) {
      message.error(
        t('File Count Limit Exceeded', {
          current: currentTotal,
          max: MAX_FILES_LIMIT
        })
      )
      input.value = ''
      return
    }

    // 内存警告
    if (currentTotal > MEMORY_WARNING_THRESHOLD && !isMemoryWarning.value) {
      isMemoryWarning.value = true
      message.warning(
        t('Memory Warning', {
          count: currentTotal,
          threshold: MEMORY_WARNING_THRESHOLD
        })
      )
    }

    // 更新展示列表
    Array.from(input.files).forEach(f =>
      selectedItems.value.push({
        type: 'file',
        name: f.name,
        size: f.size,
        files: [{ file: f, prefix: props.prefix }],
      })
    )

    // 更新总文件数
    totalFileCount.value = currentTotal
  }
}

const handleFolderSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement

  if (!input.files || input.files.length === 0) return

  const fileCount = input.files.length
  const currentTotal = totalFileCount.value + fileCount

  // 检查文件数量限制
  if (currentTotal > MAX_FILES_LIMIT) {
    message.error(
      t('File Count Limit Exceeded', {
        current: currentTotal,
        max: MAX_FILES_LIMIT
      })
    )
    input.value = ''
    return
  }

  // 内存警告
  if (currentTotal > MEMORY_WARNING_THRESHOLD && !isMemoryWarning.value) {
    isMemoryWarning.value = true
    message.warning(
      t('Memory Warning', {
        count: currentTotal,
        threshold: MEMORY_WARNING_THRESHOLD
      })
    )
  }

  // 开始 loading
  isFolderLoading.value = true
  folderLoadingProgress.value = 0

  try {
    const folderFiles = Array.from(input.files)
    const folderMap = new Map<string, OptimizedFileGroup>()
    const batchSize = 200 // 增加批处理大小以提高性能

    // 分批处理文件，避免阻塞主线程
    for (let i = 0; i < folderFiles.length; i += batchSize) {
      const batch = folderFiles.slice(i, i + batchSize)

      // 处理当前批次的文件
      for (const file of batch) {
        // 保留完整目录路径（去掉最后的文件名）
        const pathParts = file.webkitRelativePath.split('/')
        pathParts.pop() // 移除文件名
        const folderPath = pathParts.join('/') || t('Unknown Folder')

        if (!folderMap.has(folderPath)) {
          folderMap.set(folderPath, {
            files: [],
            totalSize: 0,
            fileCount: 0
          })
        }

        const group = folderMap.get(folderPath)!
        group.files.push(file)
        group.totalSize += file.size
        group.fileCount++
      }

      // 更新进度
      folderLoadingProgress.value = Math.round(((i + batch.length) / folderFiles.length) * 100)

      // 让出主线程，保证 UI 可响应
      await new Promise(resolve => setTimeout(resolve, 1))
    }

    // 将每个完整路径和对应文件放到 selectedItems
    for (const [folderPath, group] of folderMap.entries()) {
      selectedItems.value.push({
        type: 'folder',
        name: folderPath,
        size: group.totalSize,
        fileCount: group.fileCount,
        files: group.files.map(file => ({ file, prefix: `${props.prefix}${folderPath}/` })),
      })
    }

    // 更新总文件数
    totalFileCount.value = currentTotal

    // 检查内存使用情况
    setTimeout(checkMemoryUsage, 1000)

  } catch (error) {
    console.error('处理文件夹时出错:', error)
    message.error(t('Folder Processing Error'))
  } finally {
    // 结束 loading
    isFolderLoading.value = false
    folderLoadingProgress.value = 100

    // 重置文件输入，允许重复选择同一文件夹
    input.value = ''
  }
}

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer?.files) {
    const droppedFiles = Array.from(e.dataTransfer.files)
    droppedFiles.forEach(file =>
      selectedItems.value.push({
        type: 'file',
        name: file.name,
        size: file.size,
        files: [{ file, prefix: props.prefix }],
      })
    )
  }
}

const hasFiles = computed(() => selectedItems.value.length > 0)
const allFiles = computed(() => selectedItems.value.flatMap(item => item.files || []))

// 内存使用级别计算
const getMemoryUsageLevel = () => {
  const count = totalFileCount.value
  if (count < 1000) return t('Memory Low')
  if (count < MEMORY_WARNING_THRESHOLD) return t('Memory Medium')
  if (count < MAX_FILES_LIMIT) return t('Memory High')
  return t('Memory Critical')
}

// 格式化字节大小
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function removeItem(index: number) {
  const item = selectedItems.value[index]
  if (item.type === 'folder' && item.fileCount) {
    totalFileCount.value -= item.fileCount
  } else if (item.type === 'file') {
    totalFileCount.value -= 1
  }

  selectedItems.value.splice(index, 1)

  // 如果文件数量降低，重置内存警告
  if (totalFileCount.value <= MEMORY_WARNING_THRESHOLD) {
    isMemoryWarning.value = false
  }
}

async function handleUpload() {
  const filesToUpload = allFiles.value
  if (!filesToUpload.length) return

  isAdding.value = true
  addProgress.value = 0

  // 分组
  const uploadGroups = new Map<string, File[]>()
  filesToUpload.forEach(fileItem => {
    const key = `${props.bucketName}:${fileItem.prefix}`
    if (!uploadGroups.has(key)) uploadGroups.set(key, [])
    uploadGroups.get(key)!.push(fileItem.file)
  })

  // 统计总数
  const total = Array.from(uploadGroups.values()).reduce((sum, arr) => sum + arr.length, 0)
  let done = 0

  // 分批异步添加，避免阻塞主线程
  for (const [key, files] of uploadGroups.entries()) {
    const [bucketName, prefix] = key.split(':')
    for (let i = 0; i < files.length; i += 50) {
      const batch = files.slice(i, i + 50)
      // 让出主线程，保证 UI 可响应
      await new Promise(resolve => setTimeout(resolve, 0))
      await uploadTaskManagerStore.addFiles(batch, bucketName, prefix)
      done += batch.length
      addProgress.value = Math.round((done / total) * 100)
    }
  }

  isAdding.value = false
  addProgress.value = 100
  selectedItems.value = []
  emit('submit')
  closeModal()
}
</script>
