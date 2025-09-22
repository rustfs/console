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
          <n-button type="primary" @click="selectFile">{{ t('Select File') }}</n-button>
          <div>{{ t('Or') }}</div>
          <n-button @click="selectFolder">{{ t('Select Folder') }}</n-button>
          <div>{{ t('Upload To') }}</div>
          <div class="text-cyan-600">{{ bucketName }}{{ prefix || '/' }}</div>
        </div>

        <n-alert title="" type="info">
          {{ t('Overwrite Warning') }}
        </n-alert>

        <div @dragover.prevent @drop.prevent="handleDrop">
          <div
            v-if="selectedItems.length === 0"
            class="flex flex-col gap-6 items-center justify-center border border-dashed border-muted rounded p-4 h-[40vh]"
          >
            <div class="text-gray-500 font-bold">{{ t('No Selection') }}</div>
            <div class="text-muted-foreground text-center">
              {{ t('Drag Drop Info') }}<br />
              {{ t('File Size Limit') }}
            </div>
          </div>

          <!-- 虚拟滚动文件与文件夹列表 -->
          <n-virtual-list
            v-if="selectedItems.length"
            :items="selectedItems"
            :item-size="40"
            class="h-[40vh] overflow-y-auto border rounded"
          >
            <template #default="{ item, index }">
              <div class="flex items-center gap-2 w-full border-b py-1">
                <div class="flex-1">
                  <span v-if="item.type === 'folder'">{{ item.name }}/</span>
                  <span v-else>{{ item.name }}</span>
                </div>
                <div class="w-32 text-center">{{ formatBytes(item.size) }}</div>
                <div class="w-32 text-center">
                  <n-button text type="info" @click="removeItem(index)">{{ t('Delete') }}</n-button>
                </div>
              </div>
            </template>
          </n-virtual-list>
        </div>

        <n-progress
          v-if="isAdding"
          :percentage="addProgress"
          type="line"
          :show-indicator="true"
          style="margin-bottom: 16px"
        >
          <template #default> {{ t('Adding to Upload Queue') }} ({{ addProgress }}%) </template>
        </n-progress>

        <div class="flex justify-center gap-4">
          <n-button type="default" :disabled="!hasFiles || isAdding">{{ t('Configure') }}</n-button>
          <n-button type="primary" :disabled="!hasFiles || isAdding" :loading="isAdding" @click="handleUpload">{{
            t('Start Upload')
          }}</n-button>
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, defineEmits, defineProps, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUploadTaskManagerStore } from '~/store/upload-tasks';

const { t } = useI18n();
const uploadTaskManagerStore = useUploadTaskManagerStore();

interface FileItem {
  file: File;
  prefix: string;
}

interface SelectedItem {
  type: 'file' | 'folder';
  name: string;
  size: number;
  files?: FileItem[];
}

const emit = defineEmits(['update:show', 'submit']);

const props = defineProps<{ show: boolean; bucketName: string; prefix: string }>();

const fileInput = ref<HTMLInputElement | null>(null);
const folderInput = ref<HTMLInputElement | null>(null);

// 待上传的文件/文件夹列表
const selectedItems = ref<SelectedItem[]>([]);

const isAdding = ref(false);
const addProgress = ref(0);

const closeModal = () => emit('update:show', false);
const selectFile = () => fileInput.value?.click();
const selectFolder = () => folderInput.value?.click();

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    // 更新展示列表
    Array.from(input.files).forEach(f =>
      selectedItems.value.push({
        type: 'file',
        name: f.name,
        size: f.size,
        files: [{ file: f, prefix: props.prefix }],
      })
    );
  }
};

const handleFolderSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;

  if (input.files) {
    const folderFiles = Array.from(input.files);
    const folderMap = new Map<string, File[]>();

    for (const file of folderFiles) {
      // 保留完整目录路径（去掉最后的文件名）
      const pathParts = file.webkitRelativePath.split('/');
      pathParts.pop(); // 移除文件名
      const folderPath = pathParts.join('/') || t('Unknown Folder');

      if (!folderMap.has(folderPath)) {
        folderMap.set(folderPath, []);
      }
      folderMap.get(folderPath)?.push(file);
    }

    // 将每个完整路径和对应文件放到 selectedItems
    for (const [folderPath, files] of folderMap.entries()) {
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      selectedItems.value.push({
        type: 'folder',
        name: folderPath,
        size: totalSize,
        files: files.map(file => ({ file, prefix: `${props.prefix}${folderPath}/` })),
      });
    }
  }
};

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer?.files) {
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(file =>
      selectedItems.value.push({
        type: 'file',
        name: file.name,
        size: file.size,
        files: [{ file, prefix: props.prefix }],
      })
    );
  }
};

const hasFiles = computed(() => selectedItems.value.length > 0);
const allFiles = computed(() => selectedItems.value.flatMap(item => item.files || []));

function removeItem(index: number) {
  selectedItems.value.splice(index, 1);
}

async function handleUpload() {
  const filesToUpload = allFiles.value;
  if (!filesToUpload.length) return;

  isAdding.value = true;
  addProgress.value = 0;

  // 分组
  const uploadGroups = new Map<string, File[]>();
  filesToUpload.forEach(fileItem => {
    const key = `${props.bucketName}:${fileItem.prefix}`;
    if (!uploadGroups.has(key)) uploadGroups.set(key, []);
    uploadGroups.get(key)!.push(fileItem.file);
  });

  // 统计总数
  const total = Array.from(uploadGroups.values()).reduce((sum, arr) => sum + arr.length, 0);
  let done = 0;

  // 分批异步添加，避免阻塞主线程
  for (const [key, files] of uploadGroups.entries()) {
    const [bucketName, prefix] = key.split(':');
    for (let i = 0; i < files.length; i += 50) {
      const batch = files.slice(i, i + 50);
      // 让出主线程，保证 UI 可响应
      await new Promise(resolve => setTimeout(resolve, 0));
      await uploadTaskManagerStore.addFiles(batch, bucketName, prefix);
      done += batch.length;
      addProgress.value = Math.round((done / total) * 100);
    }
  }

  isAdding.value = false;
  addProgress.value = 100;
  selectedItems.value = [];
  emit('submit');
  closeModal();
}
</script>
