<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between">
      <div>{{ task.key }}</div>
      <n-button text @click="handleDeleteTask" type="info">删除记录</n-button>
    </div>
    <n-progress type="line" :height="2" :percentage="task.progress" :show-indicator="false" :processing="task.status == 'deleting'" />
    <div class="flex items-center justify-between text-muted-foreground">
      <div></div>
      <div class="text-muted-foreground">
        <span v-if="task.status === 'pending'">等待删除</span>
        <span v-else-if="task.status === 'deleting'">删除中</span>
        <span v-else-if="task.status === 'completed'">删除成功</span>
        <span v-else-if="task.status === 'failed'">删除失败</span>
        <span v-else-if="task.status === 'canceled'">已取消</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DeleteTask } from '~/lib/delete-task-manager'
import { useDeleteTaskManagerStore } from '~/store/delete-tasks'

const store = useDeleteTaskManagerStore()

const props = defineProps<{ task: DeleteTask }>()

const handleDeleteTask = () => {
  store.removeTask(props.task.id)
}
</script>
