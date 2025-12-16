<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center">
      <template v-for="segment in displaySegments">
        <span class="text-gray-500">/</span>
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
      :id="`copy-path-btn-${buttonId}`"
      variant="ghost"
      size="sm"
      class="shrink-0"
      :data-clipboard-text="fullPath"
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
import ClipboardJS from 'clipboard'
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  objectKey: string
  bucketName?: string
  onClick: (path: string) => any
}>()

const clipboard = ref<ClipboardJS | null>(null)
const buttonId = ref(`${Math.random().toString(36).substring(2, 15)}`)
const copied = ref(false)

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

const showCopiedState = () => {
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 3000)
}

onMounted(() => {
  clipboard.value = new ClipboardJS(`#copy-path-btn-${buttonId.value}`)

  clipboard.value.on('success', function (e) {
    showCopiedState()
    e.clearSelection()
  })

  clipboard.value.on('error', async function () {
    if (navigator.clipboard && fullPath.value) {
      await navigator.clipboard.writeText(fullPath.value)
      showCopiedState()
    }
  })
})

onUnmounted(() => {
  clipboard.value?.destroy()
  clipboard.value = null
})
</script>
