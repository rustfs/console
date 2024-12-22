<template>
  <n-button text v-if="total > 0" @click="toggleDrawer">
    <div v-if="pending.length">
      <n-spin size="small" />
      <span>{{ total }} 任务进行中（进行中 {{ uploading.length }} 个，已成功 {{ completed.length }} 个）</span>
    </div>
    <div v-else>上传完成（成功 {{ completed.length }} 个，失败 {{ failed.length }} 个）</div>
  </n-button>

  <n-drawer v-model:show="showDrawer" :width="502">
    <n-drawer-content title="任务管理" closable>
      <div class="flex flex-col gap-4">
        <n-alert type="warning" :show-icon="false">
          <p><span class="text-red-500">刷新/关闭浏览器</span> 将取消当前所有任务。</p>
          <p><span class="text-red-500">清空浏览器缓存、session过期</span>等情况会导致任务中断或丢失，请谨慎操作。</p>
        </n-alert>
        <div v-if="total > 0">
          <div class="flex items-center justify-between">
            <div>{{ total - (pending.length + uploading.length) }}/{{ total }}</div>
            <n-button text type="info" @click="clearTasks">清空记录</n-button>
          </div>
          <n-progress type="line" :height="2" :percentage="percentage" :show-indicator="false" :processing="percentage < 100" />
        </div>
        <n-tabs type="line" animated>
          <n-tab-pane :tab="`待处理(${pending.length})`" name="pending">
            <object-upload-task-list :tasks="pending" />
          </n-tab-pane>
          <n-tab-pane :tab="`进行中(${uploading.length})`" name="uploading">
            <object-upload-task-list :tasks="uploading" />
          </n-tab-pane>
          <n-tab-pane :tab="`已完成(${completed.length})`" name="completed">
            <object-upload-task-list :tasks="completed" />
          </n-tab-pane>
          <n-tab-pane :tab="`已失败(${failed.length})`" name="failed">
            <object-upload-task-list :tasks="failed" />
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useUploadTaskManagerStore } from '~/store/upload-tasks'

const showDrawer = ref(false)

const store = useUploadTaskManagerStore()

const tasks = computed(() => store.tasks)
const total = computed(() => tasks.value.length)
const percentage = computed(() => total.value === 0 ? 100 : Math.floor((completed.value.length / total.value) * 100))

const pending = computed(() => tasks.value.filter(task => task.status === 'pending'))
const uploading = computed(() => tasks.value.filter(task => task.status === 'uploading'))
const completed = computed(() => tasks.value.filter(task => task.status === 'completed'))
const failed = computed(() => tasks.value.filter(task => task.status === 'failed'))

const toggleDrawer = () => {
  showDrawer.value = !showDrawer.value
}

const clearTasks = () => {
  store.clearTasks()
}
</script>
