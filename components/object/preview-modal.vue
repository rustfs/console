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
        <div v-else v-html="content" class="prose dark:prose-invert max-w-none" />
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

const loading = ref(false)
const content = ref('')

watch(
  () => props.show,
  value => {
    if (value) fetchContent()
  }
)

const fetchContent = async () => {
  if (!props.object) return
  loading.value = true
  try {
    const response = await fetch(props.object.SignedUrl)
    content.value = await response.text()
  } catch (error) {
    content.value = t('Preview unavailable')
  } finally {
    loading.value = false
  }
}

const closeModal = () => emit('update:show', false)
</script>
