<script lang="ts" setup>
import ClipboardJS from 'clipboard'

const props = defineProps({
  readonly: {
    type: Boolean,
    default: false,
  },
  copyIcon: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    required: false,
    default: () => {
      return `copy-input-${Math.random().toString(36).substring(2, 15)}`;
    },
  },
});

const model = defineModel<string>();

const message = useMessage();
function handleCopy() {
  const value = model.value;
  if (!value) {
    message.error('当前无内容');
    return;
  }

  try {
    // @ts-ignore
    ClipboardJS.copy(document.querySelector(`#${props.id}`)).then(() => {
      message.success('复制成功');
    });
  } catch (error) {
    message.error('复制失败')
    console.error('复制失败', error);
  }
}
</script>

<template>
  <div class="h-full">
    <NInputGroup>
      <n-input v-model:value="model" :readonly="props.readonly" :id="props.id" />
      <n-input-group-label v-if="props.copyIcon" class="flex items-center" @click="handleCopy">
        <Icon :size="25" name="ri:file-copy-line"></Icon>
      </n-input-group-label>
      <NButton type="primary" @click="handleCopy" v-else>复制</NButton>
    </NInputGroup>
  </div>
</template>
