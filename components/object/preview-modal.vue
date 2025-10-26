<template>
  <AppModal v-model="visibleProxy" :title="t('Preview')" size="xl" :close-on-backdrop="false">
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-end gap-2">
        <AppButton variant="outline" size="sm" @click="closeModal">
          <Icon name="ri:close-line" class="size-4" />
          {{ t('Close') }}
        </AppButton>
      </div>
      <div class="min-h-[300px] rounded-md border border-border/60 p-4">
        <AppSpinner v-if="loading" class="mx-auto size-8" />
        <template v-else>
          <div v-if="isImage" class="flex justify-center">
            <img :src="previewUrl" alt="preview" class="max-h-[60vh]" />
          </div>
          <iframe v-else-if="isPdf" :src="previewUrl" class="h-[70vh] w-full" frameborder="0" />
          <pre v-else-if="isText" class="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words">{{ textContent }}</pre>
          <video v-else-if="isVideo" controls class="w-full">
            <source :src="previewUrl" :type="contentType" />
            {{ t('Your browser does not support the video tag') }}
          </video>
          <audio v-else-if="isAudio" controls class="w-full">
            <source :src="previewUrl" :type="contentType" />
            {{ t('Your browser does not support the audio tag') }}
          </audio>
          <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
            {{ t('Cannot Preview', { contentType: contentType || 'unknown' }) }}
          </div>
        </template>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { AppButton, AppModal, AppSpinner } from '@/components/app'
import { Icon } from '#components'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const TEXT_MIMES = [
  'application/json',
  'application/xml',
  'application/javascript',
  'text/plain',
  'text/html',
  'text/css',
  'text/csv',
  'text/markdown',
]
const TEXT_EXTENSIONS = ['.txt', '.json', '.xml', '.js', '.ts', '.css', '.md', '.html', '.csv', '.yml', '.yaml']
const ALLOWED_SIZE = 1024 * 1024 * 2 // 2MB

const props = defineProps<{
  show: boolean
  object: any
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const visibleProxy = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})

const contentType = computed(() => props.object?.ContentType || '')
const previewUrl = computed(() => props.object?.SignedUrl || '')
const objectSize = computed(() => Number(props.object?.ContentLength ?? 0))
const objectKey = computed(() => props.object?.Key || '')

const isImage = computed(() => contentType.value.startsWith('image/'))
const isVideo = computed(() => contentType.value.startsWith('video/'))
const isAudio = computed(() => contentType.value.startsWith('audio/'))
const isPdf = computed(() => contentType.value === 'application/pdf' || objectKey.value.endsWith('.pdf'))
const isText = computed(() => {
  if (objectSize.value > ALLOWED_SIZE) return false
  return (
    TEXT_MIMES.some(mime => contentType.value.startsWith(mime)) ||
    TEXT_EXTENSIONS.some(ext => objectKey.value.toLowerCase().endsWith(ext))
  )
})

const loading = ref(false)
const textContent = ref('')

watch(
  () => props.show,
  value => {
    if (value) loadContent()
    else reset()
  }
)

const loadContent = async () => {
  if (!props.object) return
  if (!isText.value) {
    textContent.value = ''
    return
  }

  loading.value = true
  try {
    const response = await fetch(previewUrl.value)
    textContent.value = await response.text()
  } catch (error) {
    textContent.value = t('Preview unavailable')
  } finally {
    loading.value = false
  }
}

const reset = () => {
  loading.value = false
  textContent.value = ''
}

const closeModal = () => emit('update:show', false)
</script>
