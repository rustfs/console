<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center">
      <template v-for="segment in displaySegments">
        <span class="text-gray-500">&nbsp;/&nbsp;</span>
        <button
          @click="() => handleOnClick(segment)"
          :class="{ 'text-blue-500 hover:underline': segment.index > -1, 'cursor-default': segment.index === -1 }"
        >
          {{ segment.value }}
        </button>
      </template>
    </div>
    <Button
      v-if="props.objectKey"
      variant="ghost"
      size="sm"
      class="shrink-0"
      @click="copy(fullPath)"
      :title="t('Copy Path')"
    >
      <Icon v-if="!copied" :size="16" name="ri:file-copy-line" />
      <Icon v-else :size="16" name="ri:check-line" class="text-green-600" />
      <span class="sr-only">{{ t('Copy Path') }}</span>
    </Button>
  </div>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button'
import { Icon } from '#components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  objectKey: string
  bucketName?: string
  onClick: (path: string) => any
}>()

const fullPath = computed(() => {
  if (props.bucketName) {
    return `${props.bucketName}/${props.objectKey}`
  }
  return props.objectKey
})

const segments = computed(() =>
  props.objectKey
    .split('/')
    .filter(Boolean)
    .map((item, index) => {
      return {
        value: item,
        index,
      }
    })
)

const { copy, copied } = useClipboard({ copiedDuring: 3000 })

const displaySegments = computed(() => {
  if (segments.value.length <= 6) {
    return segments.value
  }

  return [...segments.value.slice(0, 3), { value: '...', index: -1 }, ...segments.value.slice(-3)]
})

const handleOnClick = (segment: { value: string; index: number }) => {
  if (segment.index === -1) {
    return
  }

  const path = segments.value
    .slice(0, segment.index + 1)
    .map(item => item.value)
    .join('/')
  props.onClick(path)
}
</script>
