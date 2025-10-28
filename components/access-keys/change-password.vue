<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

import Modal from '@/components/modal.vue'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  visible: boolean
}
const { visible } = defineProps<Props>()

const emit = defineEmits<Emits>()
const formModel = reactive({
  current_secret_key: '',
  new_secret_key: '',
  re_new_secret_key: '',
})

const errors = reactive({
  current_secret_key: '',
  new_secret_key: '',
  re_new_secret_key: '',
})

const submitting = ref(false)
const message = useMessage()
const { $api } = useNuxtApp()

const modalVisible = computed({
  get() {
    return visible
  },
  set(value) {
    closeModal(value)
  },
})

interface Emits {
  (e: 'update:visible', visible: boolean): void
}

function clearForm() {
  formModel.current_secret_key = ''
  formModel.new_secret_key = ''
  formModel.re_new_secret_key = ''
  Object.keys(errors).forEach(key => {
    errors[key as keyof typeof errors] = ''
  })
}

function closeModal(visible = false) {
  emit('update:visible', visible)
  if (!visible) {
    clearForm()
    submitting.value = false
  }
}

function validate() {
  errors.current_secret_key = formModel.current_secret_key ? '' : t('Please enter current password')
  errors.new_secret_key = formModel.new_secret_key ? '' : t('Please enter new password')

  if (!formModel.re_new_secret_key) {
    errors.re_new_secret_key = t('Please enter new password again')
  } else if (formModel.re_new_secret_key !== formModel.new_secret_key) {
    errors.re_new_secret_key = t('The two passwords are inconsistent')
  } else {
    errors.re_new_secret_key = ''
  }

  return !errors.current_secret_key && !errors.new_secret_key && !errors.re_new_secret_key
}

async function submitForm() {
  if (!validate()) {
    message.error(t('Please fill in the correct format'))
    return
  }

  submitting.value = true
  try {
    await $api.post('/account/change-password', {
      current_secret_key: formModel.current_secret_key,
      new_secret_key: formModel.new_secret_key,
    })
    message.success(t('Updated successfully'))
    closeModal()
  } catch (error) {
    console.error(error)
    message.error(t('Update failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Modal
    v-model="modalVisible"
    :title="t('Change current account password')"
    size="md"
    :close-on-backdrop="false"
  >
    <div class="space-y-4">
      <Field>
        <FieldLabel for="password-current">{{ t('Current Password') }}</FieldLabel>
        <FieldContent>
          <Input
            id="password-current"
            v-model="formModel.current_secret_key"
            type="password"
            autocomplete="off"
          />
        </FieldContent>
        <FieldDescription v-if="errors.current_secret_key" class="text-destructive">
          {{ errors.current_secret_key }}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel for="password-new">{{ t('New Password') }}</FieldLabel>
        <FieldContent>
          <Input
            id="password-new"
            v-model="formModel.new_secret_key"
            type="password"
            autocomplete="off"
          />
        </FieldContent>
        <FieldDescription v-if="errors.new_secret_key" class="text-destructive">
          {{ errors.new_secret_key }}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel for="password-new-confirm">{{ t('Confirm New Password') }}</FieldLabel>
        <FieldContent>
          <Input
            id="password-new-confirm"
            v-model="formModel.re_new_secret_key"
            type="password"
            autocomplete="off"
            :disabled="!formModel.new_secret_key"
          />
        </FieldContent>
        <FieldDescription v-if="errors.re_new_secret_key" class="text-destructive">
          {{ errors.re_new_secret_key }}
        </FieldDescription>
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
