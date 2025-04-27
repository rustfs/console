<template>
  <n-button text v-if="total > 0" @click="toggleDrawer">
    <div v-if="pending.length" class="flex items-center gap-2">
      <n-spin :size="14" />
      <span>{{ t('Task In Progress', { uploading: uploading.length, completed: completed.length }) }}</span>
    </div>
    <div v-else>{{ t('Upload Completed', { completed: completed.length, failed: failed.length }) }}</div>
  </n-button>

  <n-drawer v-model:show="showDrawer" :width="502">
    <n-drawer-content :title="t('Task Management')" closable>
      <div class="flex flex-col gap-4">
        <n-alert type="warning" :show-icon="false">
          <p>{{ t('Browser Warning') }}</p>
          <p>{{ t('Cache Warning') }}</p>
        </n-alert>
        <div v-if="total > 0">
          <div class="flex items-center justify-between">
            <div>{{ total - (pending.length + uploading.length) }}/{{ total }}</div>
            <n-button text type="info" @click="clearTasks">{{ t('Clear Records') }}</n-button>
          </div>
          <n-progress type="line" :height="2" :percentage="percentage" :show-indicator="false" :processing="percentage < 100" />
        </div>
        <n-tabs type="line" animated v-model:value="tab">
          <n-tab-pane :tab="t('Pending', { count: pending.length })" name="pending">
            <object-upload-task-list :tasks="pending" />
          </n-tab-pane>
          <n-tab-pane :tab="t('Uploading', { count: uploading.length })" name="uploading">
            <object-upload-task-list :tasks="uploading" />
          </n-tab-pane>
          <n-tab-pane :tab="t('Completed', { count: completed.length })" name="completed">
            <object-upload-task-list :tasks="completed" />
          </n-tab-pane>
          <n-tab-pane :tab="t('Failed', { count: failed.length })" name="failed">
            <object-upload-task-list :tasks="failed" />
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUploadTaskManagerStore } from '~/store/upload-tasks'

const { t } = useI18n()
const showDrawer = ref(false)

const store = useUploadTaskManagerStore()
const tasks = computed(() => store.tasks)

const total = computed(() => tasks.value.length)
const percentage = computed(() => total.value === 0 ? 100 : Math.floor((completed.value.length / total.value) * 100))

const pending = computed(() => tasks.value.filter(task => task.status === 'pending'))
const uploading = computed(() => tasks.value.filter(task => task.status === 'uploading'))
const completed = computed(() => tasks.value.filter(task => task.status === 'completed'))
const failed = computed(() => tasks.value.filter(task => task.status === 'failed'))

const tab = ref('pending')

// 根据任务执行状态切换任务列表，如果有进行中的任务则默认展示进行中，否则展示已完成
watch(percentage, () => {
  if (uploading.value.length > 0) {
    tab.value = 'uploading'
  } else {
    tab.value = 'completed'
  }
})

// 第一次加入任务时自动打开抽屉
const autoOpened = ref(false)
watch(total, (newVal, oldVal) => {
  if (!autoOpened.value && !showDrawer.value && oldVal === 0 && newVal > 0) {
    showDrawer.value = true
    autoOpened.value = true
  }
})

const toggleDrawer = () => {
  showDrawer.value = !showDrawer.value
}

const clearTasks = () => {
  store.clearTasks()
}
</script>
