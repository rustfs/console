<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between">
      <div>{{ task.key }}</div>
      <n-button text @click="handleDeleteTask" type="info">{{ t('Delete Record') }}</n-button>
    </div>
    <n-progress type="line" :height="2" :percentage="task.progress" :show-indicator="false" :processing="task.status == 'deleting'" />
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
import type { DeleteTask } from '~/lib/delete-task-manager'
import { useDeleteTaskManagerStore } from '~/store/delete-tasks'
const { t } = useI18n()
const store = useDeleteTaskManagerStore()

const props = defineProps<{ task: DeleteTask }>()

const handleDeleteTask = () => {
  store.removeTask(props.task.id)
}
</script>
