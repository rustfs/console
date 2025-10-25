<script lang="ts" setup>
import { Icon } from '#components'
import ClipboardJS from 'clipboard'
import AppButton from '@/components/app/AppButton.vue'
import AppInput from '@/components/app/AppInput.vue'
import { useMessage } from '@/lib/ui/message'
import { onUnmounted } from 'vue'
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
      return `copy-input-${Math.random().toString(36).substring(2, 15)}`
    },
  },
})

const model = defineModel<string>()

const message = useMessage()

const clipboard = new ClipboardJS(props.copyIcon ? `#${props.id}-btn-icon` : `#${props.id}-btn`)
clipboard.on('success', function (e) {
  message.success(t('Copy Success'))
  e.clearSelection()
})

// 这里成功的时候也响应error，所以这里也加上
clipboard.on('error', function (e) {
  // 如果复制失败，则使用navigator.clipboard.writeText进行复制
  if (navigator.clipboard) {
    navigator.clipboard.writeText(model.value || '')
  }
  message.success(t('Copy Success'))
})
onUnmounted(() => {
  clipboard.destroy()
})
</script>

<template>
  <div class="flex h-full items-center gap-2">
    <AppInput
      v-model="model"
      :readonly="props.readonly"
      :id="props.id"
      class="flex-1"
    />
    <AppButton
      v-if="!props.copyIcon"
      :id="`${props.id}-btn`"
      :data-clipboard-target="`#${props.id}`"
      variant="primary"
    >
      {{ t('Copy') }}
    </AppButton>
    <AppButton
      v-else
      :id="`${props.id}-btn-icon`"
      variant="ghost"
      size="sm"
      class="shrink-0"
      :data-clipboard-target="`#${props.id}`"
      :title="t('Copy')"
    >
      <Icon :size="18" name="ri:file-copy-line" />
      <span class="sr-only">{{ t('Copy') }}</span>
    </AppButton>
  </div>
</template>
