<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between gap-3 group">
      <div class="truncate text-sm font-medium text-foreground">{{ task.file.name }}</div>
      <div class="flex shrink-0 items-center gap-1.5">
        <Button v-if="task.status === 'uploading'" variant="ghost" size="sm" class="text-xs" @click="handlePauseTask">
          {{ t('Pause') }}
        </Button>
        <Button v-if="task.status === 'paused'" variant="ghost" size="sm" class="text-xs" @click="handleResumeTask">
          {{ t('Resume') }}
        </Button>
        <Button variant="ghost" size="sm" class="opacity-0 group-hover:opacity-100 text-xs" @click="handleDeleteTask">
          <Trash2Icon class="size-4 text-red-500" />
        </Button>
      </div>
    </div>
    <Progress v-model="task.progress" class="h-0.5" />
    <div class="flex items-center justify-between text-muted-foreground">
      <div>{{ formatBytes(task.file.size) }}</div>
      <div class="text-muted-foreground text-xs">
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
import { Button } from '@/components/ui/button'

import Progress from '@/components/ui/progress/Progress.vue'
import { Trash2Icon } from 'lucide-vue-next'
import type { UploadTask } from '~/lib/upload-task-manager'
import { useUploadTaskManagerStore } from '~/store/upload-tasks'
import { formatBytes } from '~/utils/functions'

const { t } = useI18n()
const store = useUploadTaskManagerStore()

const props = defineProps<{ task: UploadTask }>()

const handleDeleteTask = () => {
  store.removeTask(props.task.id)
}
const handlePauseTask = () => {
  store.pauseTask(props.task.id)
}
const handleResumeTask = () => {
  store.resumeTask(props.task.id)
}
</script>
