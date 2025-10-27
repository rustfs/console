<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/spinner/Spinner.vue'

import { AppCard, AppModal, AppSwitch, AppTextarea } from '@/components/app'
import AppDateTimePicker from '@/components/app/AppDateTimePicker.vue'
import { Label } from '@/components/ui/label'
import dayjs from 'dayjs'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

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
  <AppModal
    v-model="visible"
    :title="t('Edit Key')"
    size="lg"
    :close-on-backdrop="false"
  >
    <AppCard padded class="space-y-4">
      <div class="grid gap-2">
        <Label>{{ t('Access Key') }}</Label>
        <Input v-model="formModel.accesskey" disabled />
      </div>

      <div class="grid gap-2">
        <Label>{{ t('Policy') }}</Label>
        <json-editor v-model="formModel.policy" />
      </div>

      <div class="grid gap-2">
        <Label>{{ t('Expiry') }}</Label>
        <AppDateTimePicker v-model="formModel.expiry" :min="minExpiry" />
      </div>

      <div class="grid gap-2">
        <Label>{{ t('Name') }}</Label>
        <Input v-model="formModel.name" />
      </div>

      <div class="grid gap-2">
        <Label>{{ t('Description') }}</Label>
        <AppTextarea v-model="formModel.description" :rows="3" />
      </div>

      <div class="flex items-center justify-between rounded-md border p-3">
        <span class="text-sm font-medium">{{ t('Status') }}</span>
        <AppSwitch v-model="statusBoolean" />
      </div>
    </AppCard>

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
  </AppModal>
</template>
