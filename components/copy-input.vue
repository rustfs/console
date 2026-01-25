<script lang="ts" setup>
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Icon } from '#components'
import { useMessage } from '@/lib/ui/message'
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

const { copy } = useClipboard()

async function handleCopyGeneratedUrl() {
  try {
    if (!model.value) throw new Error('No value to copy')

    await copy(model.value)

    message.success(t('Copy Success'))
  } catch (error) {
    message.error(t('Copy Failed'))
  }
}
</script>

<template>
  <div class="flex h-full items-center gap-2">
    <Input v-model="model" :readonly="props.readonly" :id="props.id" class="flex-1" />
    <Button
      v-if="!props.copyIcon"
      @click="handleCopyGeneratedUrl"
      :id="`${props.id}-btn`"
      :data-clipboard-target="`#${props.id}`"
      variant="default"
    >
      {{ t('Copy') }}
    </Button>
    <Button
      v-else
      @click="handleCopyGeneratedUrl"
      :id="`${props.id}-btn-icon`"
      variant="ghost"
      size="sm"
      class="shrink-0 outline"
      :title="t('Copy')"
    >
      <Icon :size="18" name="ri:file-copy-line" />
      <span class="sr-only">{{ t('Copy') }}</span>
    </Button>
  </div>
</template>
