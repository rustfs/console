<template>
  <n-modal :show="show" @update:show="val => $emit('update:show', val)" size="huge">
    <n-card class="max-w-screen-md">
      <template #header>
        <div style="display:flex; justify-content: space-between; align-items:center;">
          <span>上传文件</span>
          <n-button size="small" ghost @click="closeModal">关闭</n-button>
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <input type="file" ref="fileInput" multiple hidden @change="handleFileSelect" />
          <input type="file" ref="folderInput" webkitdirectory directory hidden @change="handleFolderSelect" />
          <n-button type="primary" @click="selectFile">选择文件</n-button>
          <div>或</div>
          <n-button @click="selectFolder">选择文件夹</n-button>
          <div>上传至</div>
          <div class="text-cyan-600">{{ bucketName }}{{ prefix || '/' }}</div>
        </div>

        <n-alert title="" type="info">
          若上传路径中存在同名文件，上传将覆盖原有文件。
        </n-alert>

        <div @dragover.prevent @drop.prevent="handleDrop">
          <div v-if="selectedItems.length === 0" class="flex flex-col gap-6 items-center justify-center border border-dashed border-muted rounded p-4 h-[40vh]">
            <div class="text-gray-500 font-bold">未选择文件/文件夹</div>
            <div class="text-muted-foreground text-center">
              Chrome 和 FireFox 支持拖拽到此区域上传，支持选择多个文件/文件夹<br>
              单个文件最大支持 512GB，上传更大的文件请使用命令行工具
            </div>
          </div>

          <!-- 展示文件与文件夹 -->
          <n-list v-if="selectedItems.length" bordered class="h-[40vh] overflow-y-auto sticky-header relative">
            <template #header>
              <div class="flex items-center gap-2 font-bold">
                <div class="flex-1">已选择文件/文件夹</div>
                <div class="w-32 text-center">大小</div>
                <div class="w-32 text-center">操作</div>
              </div>
            </template>
            <n-list-item v-for="(item, index) in selectedItems" :key="index">
              <div class="flex items-center gap-2 w-full">
                <div class="flex-1">
                  <span v-if="item.type === 'folder'">{{ item.name }}/</span>
                  <span v-else>{{ item.name }}</span>
                </div>
                <div class="w-32 text-center">{{ formatBytes(item.size) }}</div>
                <div class="w-32 text-center">
                  <n-button text type="info" @click="removeItem(index)">删除</n-button>
                </div>
              </div>
            </n-list-item>
          </n-list>
        </div>

        <div class="flex justify-center gap-4">
          <n-button type="default" :disabled="!hasFiles">参数配置</n-button>
          <n-button type="primary" :disabled="!hasFiles" @click="handleUpload">开始上传</n-button>
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { prefix } from 'naive-ui/es/_utils/cssr'
import { computed, defineEmits, defineProps, ref } from 'vue'
import { useUploadTaskManagerStore } from '~/store/upload-tasks'

const uploadTaskManagerStore = useUploadTaskManagerStore()

interface FileItem {
  file: File,
  prefix: string
}

interface SelectedItem {
  type: 'file' | 'folder'
  name: string
  size: number
  files?: FileItem[]
}

const emit = defineEmits(['update:show', 'submit'])

const props = defineProps<{ show: boolean; bucketName: string; prefix: string }>()

const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)

// 待上传的文件/文件夹列表
const selectedItems = ref<SelectedItem[]>([])

const closeModal = () => emit('update:show', false)
const selectFile = () => fileInput.value?.click()
const selectFolder = () => folderInput.value?.click()

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files) {
    // 更新展示列表
    Array.from(input.files).forEach(f => selectedItems.value.push(
      { type: 'file', name: f.name, size: f.size, files: [{ file: f, prefix: props.prefix }] }
    ))
  }
}

const handleFolderSelect = (e: Event) => {
  const input = e.target as HTMLInputElement

  if (input.files) {
    const folderFiles = Array.from(input.files)
    const folderMap = new Map<string, File[]>()

    for (const file of folderFiles) {
      // 保留完整目录路径（去掉最后的文件名）
      const pathParts = file.webkitRelativePath.split('/')
      pathParts.pop() // 移除文件名
      const folderPath = pathParts.join('/') || '未知文件夹'

      if (!folderMap.has(folderPath)) {
        folderMap.set(folderPath, [])
      }
      folderMap.get(folderPath)?.push(file)
    }

    // 将每个完整路径和对应文件放到 selectedItems
    for (const [folderPath, files] of folderMap.entries()) {
      const totalSize = files.reduce((acc, file) => acc + file.size, 0)
      selectedItems.value.push({
        type: 'folder',
        name: folderPath,
        size: totalSize,
        files: files.map(file => ({ file, prefix: `${props.prefix}${folderPath}/` }))
      })
    }
  }
}

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer?.files) {
    const droppedFiles = Array.from(e.dataTransfer.files)
    droppedFiles.forEach(file => selectedItems.value.push({
      type: 'file', name: file.name, size: file.size, files: [{ file, prefix: props.prefix }]
    }))
  }
}

const hasFiles = computed(() => selectedItems.value.length > 0)
const allFiles = computed(() => selectedItems.value.flatMap(item => item.files || []))

function removeItem(index: number) {
  selectedItems.value.splice(index, 1)
}

function handleUpload() {
  allFiles.value.forEach(fileItem => {
    uploadTaskManagerStore.addFiles([fileItem.file], props.bucketName, fileItem.prefix)
  })
  selectedItems.value = []
  emit('submit')
  closeModal()
}
</script>
