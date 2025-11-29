<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between gap-3 group">
      <div class="truncate text-sm font-medium text-foreground">{{ displayName }}</div>
      <div class="flex shrink-0 items-center gap-1.5">
        <Button variant="ghost" size="sm" class="h-auto px-2 text-xs opacity-0 group-hover:opacity-100" @click="remove">
          <Trash2Icon class="size-4 text-red-500" />
        </Button>
      </div>
    </div>
    <Progress :model-value="task.progress" class="h-[2px]" />
    <div class="flex items-center justify-between text-muted-foreground text-xs">
      <div>{{ subInfo }}</div>
      <div>{{ statusText }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

import Progress from '@/components/ui/progress/Progress.vue'
import { Trash2Icon } from 'lucide-vue-next'
import { computed } from 'vue'
import type { AnyTask } from '~/store/tasks'
import { useTaskManagerStore } from '~/store/tasks'

const { t } = useI18n()
const store = useTaskManagerStore()

const props = defineProps<{ task: AnyTask }>()

const actionLabel = computed(() => props.task.actionLabel)
const displayName = computed(() => props.task.displayName)
const subInfo = computed(() => props.task.subInfo)

const statusText = computed(() => {
  const action = actionLabel.value
  const map: Record<string, string> = {
    pending: `${action} ${t('Waiting')}`,
    running: `${action} ${t('In Progress')}`,
    completed: `${action} ${t('Success Status')}`,
    failed: `${action} ${t('Failed Status')}`,
    paused: `${action} ${t('Paused')}`,
    canceled: `${action} ${t('Canceled')}`,
  }
  return map[props.task.status] ?? `${action} ${t('In Progress')}`
})

const remove = () => store.removeTask(props.task.id)
</script>
