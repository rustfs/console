<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between gap-3">
      <div class="truncate text-sm font-medium text-foreground">{{ task.key }}</div>
      <AppButton variant="ghost" size="xs" class="h-auto px-2 text-xs" @click="handleDeleteTask">
        {{ t('Delete Record') }}
      </AppButton>
    </div>
    <AppProgress :value="task.progress" :processing="task.status === 'deleting'" :height="2" />
    <div class="flex items-center justify-between text-muted-foreground">
      <div></div>
      <div class="text-muted-foreground">
        <span v-if="task.status === 'pending'">{{ t('Waiting') }}</span>
        <span v-else-if="task.status === 'deleting'">{{ t('Deleting') }}</span>
        <span v-else-if="task.status === 'completed'">{{ t('Success Status') }}</span>
        <span v-else-if="task.status === 'failed'">{{ t('Failed Status') }}</span>
        <span v-else-if="task.status === 'canceled'">{{ t('Canceled') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AppButton, AppProgress } from '@/components/app'
import type { DeleteTask } from '~/lib/delete-task-manager'
import { useDeleteTaskManagerStore } from '~/store/delete-tasks'

const { t } = useI18n()
const store = useDeleteTaskManagerStore()

const props = defineProps<{ task: DeleteTask }>()

const handleDeleteTask = () => {
  store.removeTask(props.task.id)
}
</script>
