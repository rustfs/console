<template>
  <Modal
    v-model="modalVisible"
    :title="t('Change Secret Key') + (accessKey ? `: ${accessKey}` : '')"
    size="md"
    :close-on-backdrop="false"
  >
    <div class="space-y-4">
      <Field>
        <FieldLabel for="secret-key-new">{{ t('New Secret Key') }}</FieldLabel>
        <FieldContent>
          <Input id="secret-key-new" v-model="formModel.new_secret_key" type="password" autocomplete="off" />
        </FieldContent>
        <FieldDescription v-if="errors.new_secret_key" class="text-destructive">
          {{ errors.new_secret_key }}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel for="secret-key-confirm">{{ t('Confirm New Secret Key') }}</FieldLabel>
        <FieldContent>
          <Input
            id="secret-key-confirm"
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

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '~/components/modal.vue'

const { t } = useI18n()
const { createUser } = useUsers()
const message = useMessage()

interface Props {
  visible: boolean
  accessKey: string
}

const props = defineProps<Props>()

const emit = defineEmits<Emits>()

interface Emits {
  (e: 'update:visible', visible: boolean): void
}

const formModel = reactive({
  new_secret_key: '',
  re_new_secret_key: '',
})

const errors = reactive({
  new_secret_key: '',
  re_new_secret_key: '',
})

const submitting = ref(false)

const modalVisible = computed({
  get() {
    return props.visible
  },
  set(value) {
    closeModal(value)
  },
})

function clearForm() {
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
  errors.new_secret_key = formModel.new_secret_key ? '' : t('Please enter new password')

  if (!formModel.re_new_secret_key) {
    errors.re_new_secret_key = t('Please enter new password again')
  } else if (formModel.re_new_secret_key !== formModel.new_secret_key) {
    errors.re_new_secret_key = t('The two passwords are inconsistent')
  } else {
    errors.re_new_secret_key = ''
  }

  return !errors.new_secret_key && !errors.re_new_secret_key
}

async function submitForm() {
  if (!validate()) {
    message.error(t('Please fill in the correct format'))
    return
  }

  submitting.value = true
  try {
    await createUser({
      accessKey: props.accessKey,
      secretKey: formModel.new_secret_key,
      status: 'enabled',
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

watch(
  () => props.visible,
  value => {
    if (value) {
      clearForm()
    }
  }
)
</script>
