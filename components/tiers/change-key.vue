<template>
  <AppModal
    v-model="visibleProxy"
    :title="t('Update Key') + '：' + nameProxy"
    size="md"
    :close-on-backdrop="false"
  >
    <div class="space-y-4">
      <div class="grid gap-2">
        <Label>{{ t('Access Key') }}</Label>
        <Input v-model="formModel.accessKey" :placeholder="t('Please enter Access Key')" autocomplete="off" />
      </div>

      <div class="grid gap-2">
        <Label>{{ t('Secret Key') }}</Label>
        <Input v-model="formModel.secretKey" type="password" autocomplete="off" :placeholder="t('Please enter Secret Key')" />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="closeModal()">{{ t('Cancel') }}</Button>
        <Button variant="default" :loading="submitting" @click="submitForm">{{ t('Submit') }}</Button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { AppModal } from '@/components/app'
import { Label } from '@/components/ui/label'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const usetier = useTiers()

const props = defineProps<{
  visible: boolean
  name: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'update:name', name: string): void
  (e: 'search'): void
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const nameProxy = computed({
  get: () => props.name,
  set: value => emit('update:name', value),
})

const formModel = reactive({
  accessKey: '',
  secretKey: '',
})

const submitting = ref(false)

watch(
  () => props.visible,
  value => {
    if (value) {
      formModel.accessKey = ''
      formModel.secretKey = ''
    }
  }
)

const closeModal = () => {
  emit('update:visible', false)
  submitting.value = false
  formModel.accessKey = ''
  formModel.secretKey = ''
}

const submitForm = async () => {
  if (!formModel.accessKey || !formModel.secretKey) {
    message.error(t('Please fill in the correct format'))
    return
  }
  submitting.value = true
  try {
    await usetier.updateTiers(props.name, {
      accessKey: formModel.accessKey,
      secretKey: formModel.secretKey,
    })
    message.success(t('Update Success'))
    emit('search')
    closeModal()
  } catch (error: any) {
    message.error(error?.message || t('Update Failed'))
  } finally {
    submitting.value = false
  }
}
</script>
