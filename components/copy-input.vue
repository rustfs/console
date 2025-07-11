<script lang="ts" setup>
import ClipboardJS from 'clipboard'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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

const clipboard = new ClipboardJS( props.copyIcon ? '#'+props.id+'btn' : '#'+props.id+'btn2');
clipboard.on('success', function(e) {
  message.success(t('Copy Success'));
  e.clearSelection();
});

// 这里成功的时候也响应error，所以这里也加上
clipboard.on('error', function(e) {
  message.success(t('Copy Success'));
});
onUnmounted(() => {
  clipboard.destroy();
});
</script>

<template>
  <div class="h-full">
    <NInputGroup>
      <n-input v-model:value="model" :readonly="props.readonly" :id="props.id" />
      <n-input-group-label v-if="props.copyIcon" class="flex items-center" :id="props.id+'btn'" :data-clipboard-target="`#${props.id}`">
        <Icon :size="25" name="ri:file-copy-line"></Icon>
      </n-input-group-label>
      <NButton type="primary" v-else :id="props.id+'btn2'" :data-clipboard-target="`#${props.id}`">{{ t('Copy') }}</NButton>
    </NInputGroup>
  </div>
</template>
