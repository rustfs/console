<template>
  <div class="flex flex-col gap-4">
    <Alert
      class="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <AlertDescription class="space-y-2 text-sm leading-relaxed">
        <p>
          <span class="font-medium text-amber-600 dark:text-amber-300">{{ t('Browser Warning') }}</span>
        </p>
        <p>
          <span class="font-medium text-amber-600 dark:text-amber-300">{{ t('Cache Warning') }}</span>
        </p>
      </AlertDescription>
    </Alert>

    <div v-if="total > 0" class="space-y-3">
      <div class="flex items-center justify-between text-sm text-muted-foreground">
        <div>{{ total - (pending.length + processing.length) }}/{{ total }}</div>
        <Button variant="ghost" size="sm" class="h-auto px-2" @click="handleClearTasks">
          {{ t('Clear Records') }}
        </Button>
      </div>
      <Progress :model-value="percentage" class="h-[3px]" />
    </div>

    <Tabs v-model="tab" class="flex flex-col gap-4">
      <TabsList class="w-full justify-start overflow-x-auto">
        <TabsTrigger v-for="tabItem in tabs" :key="tabItem.value" :value="tabItem.value" class="capitalize">
          {{ tabItem.label }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" class="mt-0">
        <slot name="task-list" :tasks="pending" />
      </TabsContent>
      <TabsContent value="processing" class="mt-0">
        <slot name="task-list" :tasks="processing" />
      </TabsContent>
      <TabsContent value="completed" class="mt-0">
        <slot name="task-list" :tasks="completed" />
      </TabsContent>
      <TabsContent value="failed" class="mt-0">
        <slot name="task-list" :tasks="failed" />
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Progress from '@/components/ui/progress/Progress.vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  tasks: any[]
  onClearTasks: () => void
}>()

const { t } = useI18n()

const total = computed(() => props.tasks.length)
const percentage = computed(() => (total.value === 0 ? 100 : Math.floor((completed.value.length / total.value) * 100)))

const pending = computed(() => props.tasks.filter(task => task.status === 'pending'))
const processing = computed(() => props.tasks.filter(task => task.status === 'running'))
const completed = computed(() => props.tasks.filter(task => task.status === 'completed'))
const failed = computed(() => props.tasks.filter(task => task.status === 'failed'))

const tab = ref('pending')

const tabs = computed(() => [
  { value: 'pending', label: t('Pending', { count: pending.value.length }) },
  { value: 'processing', label: t('Processing', { count: processing.value.length }) },
  { value: 'completed', label: t('Completed', { count: completed.value.length }) },
  { value: 'failed', label: t('Failed', { count: failed.value.length }) },
])

// 根据任务执行状态切换任务列表
watch(
  () => ({
    processing: processing.value.length,
    pending: pending.value.length,
    completed: completed.value.length,
  }),
  ({ processing, pending, completed }) => {
    if (processing > 0) {
      tab.value = 'processing'
    } else if (pending > 0) {
      tab.value = 'pending'
    } else if (completed > 0) {
      tab.value = 'completed'
    } else {
      tab.value = 'pending'
    }
  },
  { immediate: true }
)

const handleClearTasks = () => {
  props.onClearTasks()
}
</script>
