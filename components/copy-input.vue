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
function handleCopy() {
  const value = model.value;
  if (!value) {
    message.error(t('No content'));
    return;
  }

  try {
    // @ts-ignore
    ClipboardJS.copy(document.querySelector(`#${props.id}`)).then(() => {
      message.success(t('Copy Success'));
    });
  } catch (error) {
    message.error(t('Copy Failed'))
    console.error(t('Copy Failed'), error);
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
      <NButton type="primary" @click="handleCopy" v-else>{{ t('Copy') }}</NButton>
    </NInputGroup>
  </div>
</template>
