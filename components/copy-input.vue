<script lang="ts" setup>
import { useClipboard } from '@vueuse/core';
const props = defineProps({
  readonly: {
    type: Boolean,
    default: false,
  },
  copyIcon: {
    type: Boolean,
    default: false,
  },
});

const model = defineModel<string>();

const { copy, isSupported } = useClipboard();
const message = useMessage();

async function handleCopy() {
  if (!isSupported) {
    message.error('您的浏览器不支持Clipboard API');
    return;
  }
  const value = model.value;

  if (!value) {
    message.error('当前无内容');
    return;
  }

  await copy(value);
  message.success(`复制成功：${value}`);
}
</script>

<template>
  <div class="h-full">
    <NInputGroup>
      <n-input v-model:value="model" :readonly="props.readonly" />
      <n-input-group-label v-if="props.copyIcon" class="flex items-center" @click="handleCopy">
        <Icon :size="25" name="ri:file-copy-line"></Icon>
      </n-input-group-label>
      <NButton type="primary" @click="handleCopy" v-else>复制</NButton>
    </NInputGroup>
  </div>
</template>
