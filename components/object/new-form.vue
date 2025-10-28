<template>
  <Modal v-model="modalVisible" :title="t('New Form', { type: displayType })" size="md" :close-on-backdrop="false">
    <div class="space-y-4">
      <Alert>
        <AlertDescription>{{ t('Overwrite Warning') }}</AlertDescription>
      </Alert>

      <Input
        v-model="objectKey"
        :placeholder="t('Name Placeholder', { type: displayType })"
        autocomplete="off"
      />

      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="closeModal">{{ t('Close') }}</Button>
        <Button variant="default" :disabled="objectKey.trim().length < 1" @click="handlePutObject">
          {{ t('Create') }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { joinRelativeURL } from 'ufo'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/modal.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'

const { t } = useI18n()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const props = defineProps<{
  show: boolean
  bucketName: string
  prefix: string
  asPrefix?: boolean
}>()

const modalVisible = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})

const displayType = computed(() => (props.asPrefix ? t('New Folder') : t('New File')))
const objectKey = ref('')

const { putObject } = useObject({ bucket: props.bucketName })
const $message = useMessage()

const closeModal = () => emit('update:show', false)

const handlePutObject = async () => {
  const suffix = props.asPrefix ? '/' : ''
  const cleanedKey = objectKey.value.replace(/^\/+|\/+$/g, '')

  try {
    await putObject(joinRelativeURL(props.prefix, cleanedKey, suffix), '')
    emit('update:show', false)
    objectKey.value = ''
    $message.success(t('Create Success'))
  } catch (error: any) {
    $message.error(error?.message || t('Create Failed'))
  }
}
</script>
