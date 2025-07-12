<template>
  <div class="flex flex-col gap-3">
    <div v-if="tasks.length <= 0" class="mx-auto text-muted-foreground text-center">{{ t('No Tasks') }}</div>
    <object-delete-task-item v-for="task in tasks" :key="task.id" :task="task" />
  </div>
</template>

<script setup lang="ts">
import type { DeleteTask } from '~/lib/delete-task-manager'
const { t } = useI18n()
const props = defineProps<{ tasks: DeleteTask[] }>()
</script>
