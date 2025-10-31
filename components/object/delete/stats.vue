<template>
  <object-task-stats :tasks="tasks" processing-status="deleting" :on-clear-tasks="clearTasks">
    <template #task-list="{ tasks }">
      <object-delete-task-list :tasks="tasks" />
    </template>
  </object-task-stats>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDeleteTaskManagerStore } from '~/store/delete-tasks'

const store = useDeleteTaskManagerStore()
const tasks = computed(() => store.tasks)

const clearTasks = () => {
  store.clearTasks()
}
</script>
