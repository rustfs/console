<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import DateTimePicker from '@/components/datetime-picker.vue'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import dayjs from 'dayjs'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '~/components/modal.vue'

const { t } = useI18n()
const message = useMessage()
const emit = defineEmits<Emits>()
const { getServiceAccount, updateServiceAccount } = useAccessKeys()

const visible = ref(false)

const formModel = reactive({
  accesskey: '',
  policy: '',
  expiry: null as string | null,
  name: '',
  description: '',
  status: 'on',
})

const submitting = ref(false)
const accessKey = ref('')

const statusBoolean = computed({
  get: () => formModel.status === 'on',
  set: value => {
    formModel.status = value ? 'on' : 'off'
  },
})

const minExpiry = computed(() => dayjs().toISOString())

async function openDialog(row: any) {
  accessKey.value = row.accessKey
  try {
    const res = await getServiceAccount(row.accessKey)
    formModel.accesskey = row.accessKey
    const policyValue = typeof res.policy === 'string' ? res.policy : JSON.stringify(res.policy ?? {})
    formModel.policy = policyValue
    formModel.expiry = res.expiration ? dayjs(res.expiration).toISOString() : null
    formModel.name = res.name ?? ''
    formModel.description = res.description ?? ''
    formModel.status = res.accountStatus ?? 'on'
    visible.value = true
  } catch (error) {
    console.error(error)
    message.error(t('Failed to get data'))
  }
}

defineExpose({ openDialog })

interface Emits {
  (e: 'search'): void
}

function closeModal() {
  visible.value = false
  submitting.value = false
}

async function submitForm() {
  if (!accessKey.value) return
  submitting.value = true
  try {
    await updateServiceAccount(accessKey.value, {
      newPolicy: formModel.policy || '{}',
      newStatus: formModel.status,
      newName: formModel.name,
      newDescription: formModel.description,
      newExpiration: formModel.expiry ? dayjs(formModel.expiry).toISOString() : undefined,
    })
    message.success(t('Updated successfully'))
    closeModal()
    emit('search')
  } catch (error) {
    console.error(error)
    message.error(t('Update failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Modal v-model="visible" :title="t('Edit Key')" size="lg" :close-on-backdrop="false">
    <div class="space-y-4">
      <Field>
        <FieldLabel>{{ t('Access Key') }}</FieldLabel>
        <FieldContent>
          <Input v-model="formModel.accesskey" disabled />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>{{ t('Policy') }}</FieldLabel>
        <FieldContent>
          <json-editor v-model="formModel.policy" />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>{{ t('Expiry') }}</FieldLabel>
        <FieldContent>
          <DateTimePicker v-model="formModel.expiry" :min="minExpiry" />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>{{ t('Name') }}</FieldLabel>
        <FieldContent>
          <Input v-model="formModel.name" />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>{{ t('Description') }}</FieldLabel>
        <FieldContent>
          <Textarea v-model="formModel.description" :rows="2" />
        </FieldContent>
      </Field>

      <Field orientation="responsive">
        <FieldLabel class="text-sm font-medium">{{ t('Status') }}</FieldLabel>
        <FieldContent class="flex justify-end">
          <Switch v-model="statusBoolean" />
        </FieldContent>
      </Field>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="closeModal()">
          {{ t('Cancel') }}
        </Button>
        <Button variant="default" :disabled="submitting" @click="submitForm">
          <Spinner v-if="submitting" class="size-4" />
          <span>{{ t('Submit') }}</span>
        </Button>
      </div>
    </template>
  </Modal>
</template>
