<template>
  <Modal v-model="modalVisible" :title="t('Create Key')" size="lg" :close-on-backdrop="false">
    <div class="space-y-4">
      <Field>
        <FieldLabel for="create-access-key">{{ t('Access Key') }}</FieldLabel>
        <FieldContent>
          <Input id="create-access-key" v-model="formModel.accessKey" autocomplete="off" />
        </FieldContent>
        <FieldDescription v-if="errors.accessKey" class="text-destructive">
          {{ errors.accessKey }}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel for="create-secret-key">{{ t('Secret Key') }}</FieldLabel>
        <FieldContent>
          <Input id="create-secret-key" v-model="formModel.secretKey" type="password" autocomplete="off" />
        </FieldContent>
        <FieldDescription v-if="errors.secretKey" class="text-destructive">
          {{ errors.secretKey }}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel for="create-expiry">{{ t('Expiry') }}</FieldLabel>
        <FieldContent>
          <DateTimePicker id="create-expiry" v-model="formModel.expiry" :min="minExpiry" :placeholder="t('Please select expiry date')" />
        </FieldContent>
        <FieldDescription v-if="errors.expiry" class="text-destructive">
          {{ errors.expiry }}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel for="create-name">{{ t('Name') }}</FieldLabel>
        <FieldContent>
          <Input id="create-name" v-model="formModel.name" autocomplete="off" />
        </FieldContent>
        <FieldDescription v-if="errors.name" class="text-destructive">
          {{ errors.name }}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel for="create-description">{{ t('Description') }}</FieldLabel>
        <FieldContent>
          <Textarea id="create-description" v-model="formModel.description" :rows="3" />
        </FieldContent>
      </Field>

      <Field orientation="responsive" class="items-start gap-3 rounded-md border p-3">
        <FieldLabel class="text-sm font-medium">{{ t('Use main account policy') }}</FieldLabel>
        <FieldContent class="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p class="text-xs text-muted-foreground">
            {{ t('Automatically inherit the main account policy when enabled.') }}
          </p>
          <Switch v-model:checked="formModel.impliedPolicy" />
        </FieldContent>
      </Field>

      <Field v-if="!formModel.impliedPolicy">
        <FieldLabel>{{ t('Current user policy') }}</FieldLabel>
        <FieldContent>
          <json-editor v-model="formModel.policy" />
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

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import DateTimePicker from '@/components/datetime-picker.vue'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '~/components/modal.vue'
import { makeRandomString } from '~/utils/functions'

const { t } = useI18n()
interface Props {
  visible: boolean
}
const { visible } = defineProps<Props>()
const message = useMessage()
const { $api } = useNuxtApp()
const { createServiceAccount } = useAccessKeys()

const emit = defineEmits<Emits>()
const defaultFormModal = () => ({
  accessKey: makeRandomString(20),
  secretKey: makeRandomString(40),
  name: '',
  description: '',
  expiry: null as string | null,
  policy: '',
  impliedPolicy: true,
})
const formModel = reactive(defaultFormModal())

const errors = reactive({
  accessKey: '',
  secretKey: '',
  expiry: '',
  name: '',
})

const submitting = ref(false)

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'search'): void
  (e: 'notice', data: object): void
}

const modalVisible = computed({
  get() {
    return visible
  },
  set(visible) {
    closeModal(visible)
  },
})

const minExpiry = computed(() => new Date().toISOString())

function resetForm() {
  Object.assign(formModel, defaultFormModal())
  formModel.policy = JSON.stringify(parentPolicy.value)
  clearErrors()
}

function clearErrors() {
  errors.accessKey = ''
  errors.secretKey = ''
  errors.expiry = ''
  errors.name = ''
}

function closeModal(visible = false) {
  emit('update:visible', visible)
  if (!visible) {
    resetForm()
  }
}

function validate() {
  clearErrors()

  if (!formModel.accessKey) {
    errors.accessKey = t('Please enter Access Key')
  } else if (formModel.accessKey.length < 3 || formModel.accessKey.length > 20) {
    errors.accessKey = t('Access Key length must be between 3 and 20 characters')
  }

  if (!formModel.secretKey) {
    errors.secretKey = t('Please enter Secret Key')
  } else if (formModel.secretKey.length < 8 || formModel.secretKey.length > 40) {
    errors.secretKey = t('Secret Key length must be between 8 and 40 characters')
  }

  if (!formModel.expiry) {
    errors.expiry = t('Please select expiry date')
  }

  if (!formModel.name) {
    errors.name = t('Please enter name')
  }

  return !errors.accessKey && !errors.secretKey && !errors.expiry && !errors.name
}

async function submitForm() {
  if (!validate()) {
    message.error(t('Please fill in the correct format'))
    return
  }

  submitting.value = true
  try {
    let customPolicy: string | null = null
    if (!formModel.impliedPolicy) {
      try {
        customPolicy = JSON.stringify(JSON.parse(formModel.policy || '{}'))
      } catch (error) {
        message.error(t('Policy format invalid'))
        submitting.value = false
        return
      }
    }

    const payload = {
      ...formModel,
      policy: customPolicy,
      expiration: formModel.expiry,
    }

    const res = await createServiceAccount(payload)
    message.success(t('Added successfully'))
    emit('notice', res)
    closeModal()
    emit('search')
  } catch (error) {
    console.error(error)
    message.error(t('Add failed'))
  } finally {
    submitting.value = false
  }
}

const parentPolicy = ref('')
const getPolicy = async () => {
  const userInfo = await $api.get(`/accountinfo`)
  parentPolicy.value = userInfo.Policy
  formModel.policy = JSON.stringify(userInfo.Policy)
}
getPolicy()
</script>
