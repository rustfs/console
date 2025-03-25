<template>
  <n-button text v-if="total > 0" @click="toggleDrawer">
    <div v-if="pending.length" class="flex items-center gap-2">
      <n-spin :size="14" />
      <span>{{ total }} 任务进行中（进行中 {{ deleting.length }} 个，已成功 {{ completed.length }} 个）</span>
    </div>
    <div v-else>删除完成（成功 {{ completed.length }} 个，失败 {{ failed.length }} 个）</div>
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
            <div>{{ total - (pending.length + deleting.length) }}/{{ total }}</div>
            <n-button text type="info" @click="clearTasks">清空记录</n-button>
          </div>
          <n-progress type="line" :height="2" :percentage="percentage" :show-indicator="false" :processing="percentage < 100" />
        </div>
        <n-tabs type="line" animated v-model:value="tab">
          <n-tab-pane :tab="`待处理(${pending.length})`" name="pending">
            <object-delete-task-list :tasks="pending" />
          </n-tab-pane>
          <n-tab-pane :tab="`进行中(${deleting.length})`" name="deleting">
            <object-delete-task-list :tasks="deleting" />
          </n-tab-pane>
          <n-tab-pane :tab="`已完成(${completed.length})`" name="completed">
            <object-delete-task-list :tasks="completed" />
          </n-tab-pane>
          <n-tab-pane :tab="`已失败(${failed.length})`" name="failed">
            <object-delete-task-list :tasks="failed" />
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDeleteTaskManagerStore } from '~/store/delete-tasks'

const showDrawer = ref(false)

const store = useDeleteTaskManagerStore()
const tasks = computed(() => store.tasks)

const total = computed(() => tasks.value.length)
const percentage = computed(() => total.value === 0 ? 100 : Math.floor((completed.value.length / total.value) * 100))

const pending = computed(() => tasks.value.filter(task => task.status === 'pending'))
const deleting = computed(() => tasks.value.filter(task => task.status === 'deleting'))
const completed = computed(() => tasks.value.filter(task => task.status === 'completed'))
const failed = computed(() => tasks.value.filter(task => task.status === 'failed'))

const tab = ref('pending')

// 根据任务执行状态切换任务列表，如果有进行中的任务则默认展示进行中，否则展示已完成
watch(percentage, () => {
  if (deleting.value.length > 0) {
    tab.value = 'deleting'
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
