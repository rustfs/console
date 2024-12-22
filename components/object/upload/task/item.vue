<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between">
      <div>{{ task.file.name }}</div>
      <n-button text @click="handleDeleteTask" type="info">删除记录</n-button>
    </div>
    <n-progress type="line" :height="2" :percentage="task.progress" :show-indicator="false" :processing="task.status == 'uploading'" />
    <div class="flex items-center justify-between text-muted-foreground">
      <div>{{ formatBytes(task.file.size) }}</div>
      <div class="text-muted-foreground">
        <span v-if="task.status === 'pending'">等待上传</span>
        <span v-else-if="task.status === 'uploading'">上传中</span>
        <span v-else-if="task.status === 'completed'">上传成功</span>
        <span v-else-if="task.status === 'failed'">上传失败</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadTask } from '~/lib/upload-task-manager'
import { useUploadTaskManagerStore } from '~/store/upload-tasks'

const store = useUploadTaskManagerStore()

const props = defineProps<{ task: UploadTask }>()

const handleDeleteTask = () => {
  store.removeTask(props.task.id)
}
</script>
