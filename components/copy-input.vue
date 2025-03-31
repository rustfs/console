<script lang="ts" setup>
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

const message = useMessage();
 function handleCopy() {
  const value = model.value;
  if (!value) {
    message.error('当前无内容');
    return;
  }

 // 首先检查Clipboard API是否可用
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value).then(() => {
       message.success(`复制成功：${value}`);
    }).catch(err => {
      message.error(`复制失败：${err}`);
    });
  } else {
    // Clipboard API不可用，尝试使用document.execCommand
    // 创建一个临时的textarea元素来选中文本，以便复制
    let textarea = document.createElement('textarea');
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.focus({preventScroll:true});
    textarea.select();
    try {
      // 执行复制操作
      document.execCommand('copy');
      message.success(`复制成功：${value}`);
    } catch (err) {
      message.error(`复制失败：${err}`);
    }
    // 清理临时创建的textarea
    document.body.removeChild(textarea);
  }

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
