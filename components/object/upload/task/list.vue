<template>
  <div class="flex flex-col gap-3">
    <div v-if="tasks.length <= 0" class="mx-auto text-muted-foreground text-center">暂无任务</div>
    <object-upload-task-item v-for="task in tasks" :key="task.id" :task="task" />
  </div>
</template>

<script setup lang="ts">
import type { UploadTask } from '~/lib/upload-task-manager'
defineProps<{ tasks: UploadTask[] }>()
</script>
