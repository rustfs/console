<template>
  <object-task-stats :tasks="tasks" processing-status="uploading" :on-clear-tasks="clearTasks">
    <template #task-list="{ tasks }">
      <object-upload-task-list :tasks="tasks" />
    </template>
  </object-task-stats>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUploadTaskManagerStore } from '~/store/upload-tasks';

const store = useUploadTaskManagerStore();
const tasks = computed(() => store.tasks);

const clearTasks = () => {
  store.clearTasks();
};
</script>
