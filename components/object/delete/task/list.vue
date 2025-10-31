<template>
  <div class="flex flex-col gap-3">
    <EmptyState v-if="tasks.length <= 0" :title="t('No Tasks')" class="py-6" />
    <object-delete-task-item v-for="task in tasks" :key="task.id" :task="task" />
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/empty-state.vue'
import type { DeleteTask } from '~/lib/delete-task-manager'

const { t } = useI18n()

defineProps<{ tasks: DeleteTask[] }>()
</script>
