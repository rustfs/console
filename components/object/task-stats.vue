<template>
  <n-button text v-if="total > 0" @click="toggleDrawer">
    <div v-if="pending.length" class="flex items-center gap-2">
      <n-spin :size="14" />
      <span>{{
        t('In Progress', {
          total: total,
          processing: processing.length,
          completed: completed.length,
        })
      }}</span>
    </div>
    <div v-else>
      {{ t('Task Completed', { completed: completed.length, failed: failed.length }) }}
    </div>
  </n-button>

  <n-drawer v-model:show="showDrawer" :width="502">
    <n-drawer-content :title="t('Task Management')" closable>
      <div class="flex flex-col gap-4">
        <n-alert type="warning" :show-icon="false">
          <p>
            <span class="text-red-500">{{ t('Browser Warning') }}</span>
          </p>
          <p>
            <span class="text-red-500">{{ t('Cache Warning') }}</span>
          </p>
        </n-alert>
        <div v-if="total > 0">
          <div class="flex items-center justify-between">
            <div>{{ total - (pending.length + processing.length) }}/{{ total }}</div>
            <n-button text type="info" @click="clearTasks">{{ t('Clear Records') }}</n-button>
          </div>
          <n-progress
            type="line"
            :height="2"
            :percentage="percentage"
            :show-indicator="false"
            :processing="percentage < 100"
          />
        </div>
        <n-tabs type="line" animated v-model:value="tab">
          <n-tab-pane :tab="t('Pending', { count: pending.length })" name="pending">
            <slot name="task-list" :tasks="pending" />
          </n-tab-pane>
          <n-tab-pane :tab="t('Processing', { count: processing.length })" name="processing">
            <slot name="task-list" :tasks="processing" />
          </n-tab-pane>
          <n-tab-pane :tab="t('Completed', { count: completed.length })" name="completed">
            <slot name="task-list" :tasks="completed" />
          </n-tab-pane>
          <n-tab-pane :tab="t('Failed', { count: failed.length })" name="failed">
            <slot name="task-list" :tasks="failed" />
          </n-tab-pane>
          <n-tab-pane :tab="t('Paused', { count: paused.length })" name="paused">
            <slot name="task-list" :tasks="paused" />
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  tasks: any[];
  processingStatus: string;
  onClearTasks: () => void;
}>();

const { t } = useI18n();
const showDrawer = ref(false);

const total = computed(() => props.tasks.length);
const percentage = computed(() =>
  total.value === 0 ? 100 : Math.floor((completed.value.length / total.value) * 100)
);

const pending = computed(() => props.tasks.filter(task => task.status === 'pending'));
const processing = computed(() =>
  props.tasks.filter(task => task.status === props.processingStatus)
);
const completed = computed(() => props.tasks.filter(task => task.status === 'completed'));
const failed = computed(() => props.tasks.filter(task => task.status === 'failed'));
const paused = computed(() => props.tasks.filter(task => task.status === 'paused'));

const tab = ref('pending');

// 根据任务执行状态切换任务列表
watch(percentage, () => {
  if (processing.value.length > 0) {
    tab.value = 'processing';
  } else {
    tab.value = 'completed';
  }
});

// 第一次加入任务时自动打开抽屉
const autoOpened = ref(false);
watch(total, (newVal, oldVal) => {
  if (!autoOpened.value && !showDrawer.value && oldVal === 0 && newVal > 0) {
    showDrawer.value = true;
    autoOpened.value = true;
  }
});

const toggleDrawer = () => {
  showDrawer.value = !showDrawer.value;
};

const clearTasks = () => {
  props.onClearTasks();
};
</script>
