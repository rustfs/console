<template>
  <Button v-if="showButton && total > 0" variant="outline" @click="toggleDrawer">
    <div v-if="pending.length" class="flex items-center gap-2">
      <Spinner class="size-3 text-muted-foreground" />
      <span>
        {{
          t('In Progress', {
            total: total,
            processing: processing.length,
            completed: completed.length,
          })
        }}
      </span>
    </div>
    <div v-else class="flex items-center gap-2">
      <Icon name="ri:check-line" class="size-4 text-emerald-600" />
      <span>{{ t('Task Completed', { completed: completed.length, failed: failed.length }) }}</span>
    </div>
  </Button>

  <Drawer v-model="showDrawer" :title="t('Task Management')" size="lg">
    <ObjectTaskPanel :tasks="tasks" :on-clear-tasks="onClearTasks">
      <template #task-list="slotProps">
        <slot name="task-list" v-bind="slotProps" />
      </template>
    </ObjectTaskPanel>
  </Drawer>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Drawer from '~/components/drawer.vue'
import ObjectTaskPanel from '~/components/object/task/panel.vue'

const props = defineProps<{
  tasks: any[]
  onClearTasks: () => void
}>()

const { t } = useI18n()
const showDrawer = ref(false)
const showButton = ref(false)

const total = computed(() => props.tasks.length)

const pending = computed(() => props.tasks.filter(task => task.status === 'pending'))
const processing = computed(() => props.tasks.filter(task => task.status === 'running'))
const completed = computed(() => props.tasks.filter(task => task.status === 'completed'))
const failed = computed(() => props.tasks.filter(task => task.status === 'failed'))

// 第一次加入任务时自动打开抽屉
const autoOpened = ref(false)

let hideButtonTimer: ReturnType<typeof setTimeout> | null = null

// 显示按钮并设置 10 秒后自动隐藏
const showButtonWithAutoHide = () => {
  showButton.value = true

  // 清除之前的定时器
  if (hideButtonTimer) {
    clearTimeout(hideButtonTimer)
  }

  // 10 秒后隐藏按钮
  hideButtonTimer = setTimeout(() => {
    showButton.value = false
    hideButtonTimer = null
  }, 10000)
}

// 监听任务变化，有新任务时显示按钮
watch(total, (newVal, oldVal) => {
  if (oldVal === 0 && newVal > 0) {
    // 第一次加入任务时自动打开抽屉
    if (!autoOpened.value && !showDrawer.value) {
      showDrawer.value = true
      autoOpened.value = true
    }
    // 显示按钮并设置自动隐藏
    showButtonWithAutoHide()
  } else if (newVal > 0 && oldVal < newVal) {
    // 有新任务加入时，重新显示按钮
    showButtonWithAutoHide()
  }
})

const toggleDrawer = () => {
  showDrawer.value = !showDrawer.value
}

// 清理定时器
onUnmounted(() => {
  if (hideButtonTimer) {
    clearTimeout(hideButtonTimer)
  }
})
</script>
