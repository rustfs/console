<script lang="ts" setup>
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Icon } from '#components'
import { useMessage } from '@/lib/ui/message'
import ClipboardJS from 'clipboard'
import { onMounted, onUnmounted, ref } from 'vue'
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
const clipboard = ref<ClipboardJS | null>(null)

onMounted(() => {
  clipboard.value = new ClipboardJS(props.copyIcon ? `#${props.id}-btn-icon` : `#${props.id}-btn`)

  clipboard.value.on('success', function (e) {
    message.success(t('Copy Success'))
    e.clearSelection()
  })

  clipboard.value.on('error', async function () {
    // If copy fails, use navigator.clipboard.writeText as fallback
    try {
      if (navigator.clipboard && model.value) {
        await navigator.clipboard.writeText(model.value)
        message.success(t('Copy Success'))
      } else {
        message.error(t('Copy Failed'))
      }
    } catch {
      message.error(t('Copy Failed'))
    }
  })
})

onUnmounted(() => {
  clipboard.value?.destroy()
  clipboard.value = null
})
</script>

<template>
  <div class="flex h-full items-center gap-2">
    <Input v-model="model" :readonly="props.readonly" :id="props.id" class="flex-1" />
    <Button v-if="!props.copyIcon" :id="`${props.id}-btn`" :data-clipboard-target="`#${props.id}`" variant="default">
      {{ t('Copy') }}
    </Button>
    <Button
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
    </Button>
  </div>
</template>
