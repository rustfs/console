<template>
  <div class="space-y-4">
    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <Label>{{ t('Access Key') }}</Label>
        <Input v-model="formModel.accessKey" disabled />
      </div>

      <div class="space-y-2">
        <Label>{{ t('Expiration') }}</Label>
        <AppDateTimePicker
          v-model="formModel.expiry"
          :min="minExpiry"
          :placeholder="t('Please select expiration date')"
        />
      </div>

      <div class="space-y-2">
        <Label>{{ t('Name') }}</Label>
        <Input v-model="formModel.name" autocomplete="off" />
      </div>

      <div class="space-y-2">
        <Label>{{ t('Description') }}</Label>
        <Input v-model="formModel.description" autocomplete="off" />
      </div>
    </div>

    <div class="space-y-4">
      <div class="flex flex-col gap-3 rounded-md border p-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">{{ t('Use Main Account Policy') }}</p>
            <p class="text-xs text-muted-foreground">
              {{ t('Automatically inherit the main account policy when enabled.') }}
            </p>
          </div>
          <Switch v-model:checked="formModel.impliedPolicy" />
        </div>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">{{ t('Status') }}</p>
            <p class="text-xs text-muted-foreground">
              {{ formModel.accountStatus === 'on' ? t('Available') : t('Disabled') }}
            </p>
          </div>
          <Switch v-model:checked="statusBoolean" />
        </div>
      </div>
    </div>

    <div v-if="!formModel.impliedPolicy" class="space-y-2">
      <Label>{{ t('Current User Policy') }}</Label>
      <json-editor v-model="formModel.policy" />
    </div>

    <div class="flex justify-end gap-2">
      <Button variant="outline" @click="cancelEdit">
        {{ t('Cancel') }}
      </Button>
      <Button variant="default" :loading="submitting" @click="submitForm">
        {{ t('Submit') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { AppDateTimePicker } from '@/components/app'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import dayjs from 'dayjs'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const { updateServiceAccount } = useAccessKeys()
const { getPolicyByUserName } = usePolicies()

const props = defineProps<{
  user: {
    accessKey: string
    name?: string
    description?: string
    impliedPolicy?: boolean
    expiration?: string | null
    policy?: string
    accountStatus?: string
    parentUser?: string
  }
}>()

const emit = defineEmits<{
  (e: 'search'): void
}>()

const submitting = ref(false)
const parentPolicy = ref('{}')

const formModel = reactive({
  accessKey: '',
  name: '',
  description: '',
  impliedPolicy: true,
  expiry: null as string | null,
  policy: '',
  accountStatus: 'on',
})

const statusBoolean = computed({
  get: () => formModel.accountStatus === 'on',
  set: value => {
    formModel.accountStatus = value ? 'on' : 'off'
  },
})

const minExpiry = computed(() => new Date().toISOString())

const loadParentPolicy = async () => {
  if (!props.user?.parentUser) return
  try {
    const policy = await getPolicyByUserName(props.user.parentUser)
    parentPolicy.value = JSON.stringify(policy ?? {})
    if (formModel.impliedPolicy) {
      formModel.policy = parentPolicy.value
    }
  } catch (error) {
    parentPolicy.value = '{}'
  }
}

watch(
  () => props.user,
  () => {
    formModel.accessKey = props.user.accessKey ?? ''
    formModel.name = props.user.name ?? ''
    formModel.description = props.user.description ?? ''
    formModel.impliedPolicy = props.user.impliedPolicy ?? true
    formModel.expiry = props.user.expiration ?? null
    formModel.policy = props.user.policy ?? '{}'
    formModel.accountStatus = props.user.accountStatus ?? 'on'
    loadParentPolicy()
  },
  { immediate: true, deep: true }
)

watch(
  () => formModel.impliedPolicy,
  implied => {
    if (implied) {
      formModel.policy = parentPolicy.value
    }
  }
)

const cancelEdit = () => {
  emit('search')
}

const validateForm = () => {
  if (!formModel.expiry) {
    message.error(t('Please select expiration date'))
    return false
  }
  if (!formModel.impliedPolicy) {
    try {
      JSON.parse(formModel.policy || '{}')
    } catch {
      message.error(t('Policy format invalid'))
      return false
    }
  }
  return true
}

const submitForm = async () => {
  if (!validateForm()) return

  submitting.value = true
  try {
    await updateServiceAccount(props.user.accessKey, {
      newStatus: formModel.accountStatus,
      newName: formModel.name,
      newDescription: formModel.description,
      newPolicy: formModel.impliedPolicy ? null : JSON.stringify(JSON.parse(formModel.policy || '{}')),
      newExpiration: formModel.expiry ? new Date(formModel.expiry).toISOString() : null,
    })

    message.success(t('Update Success'))
    emit('search')
  } catch (error) {
    message.error(t('Update Failed'))
  } finally {
    submitting.value = false
  }
}
</script>
