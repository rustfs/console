<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between">
      <div>{{ task.file.name }}</div>
      <div class="flex gap-2">
        <n-button v-if="task.status === 'uploading'" text @click="handlePauseTask" type="warning">{{
          t('Pause')
        }}</n-button>
        <n-button v-if="task.status === 'paused'" text @click="handleResumeTask" type="success">{{
          t('Resume')
        }}</n-button>
        <n-button text @click="handleDeleteTask" type="info">{{ t('Delete Record') }}</n-button>
      </div>
    </div>
    <n-progress
      type="line"
      :height="2"
      :percentage="task.progress"
      :show-indicator="false"
      :processing="task.status == 'uploading'"
    />
    <div class="flex items-center justify-between text-muted-foreground">
      <div>{{ formatBytes(task.file.size) }}</div>
      <div class="text-muted-foreground">
        <span v-if="task.status === 'pending'">{{ t('Waiting') }}</span>
        <span v-else-if="task.status === 'uploading'">{{ t('Uploading Status') }}</span>
        <span v-else-if="task.status === 'completed'">{{ t('Success Status') }}</span>
        <span v-else-if="task.status === 'failed'">{{ t('Failed Status') }}</span>
        <span v-else-if="task.status === 'paused'">{{ t('Paused') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadTask } from '~/lib/upload-task-manager';
import { useUploadTaskManagerStore } from '~/store/upload-tasks';
const { t } = useI18n();
const store = useUploadTaskManagerStore();

const props = defineProps<{ task: UploadTask }>();

const handleDeleteTask = () => {
  store.removeTask(props.task.id);
};
const handlePauseTask = () => {
  store.pauseTask(props.task.id);
};
const handleResumeTask = () => {
  store.resumeTask(props.task.id);
};
</script>
