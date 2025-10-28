<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { AppModal } from '@/components/app'
import { Label } from '@/components/ui/label'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { $api } = useNuxtApp()
const message = useMessage()

interface PolicyItem {
  name: string
  content: string | object
}

const props = defineProps<{
  show: boolean
  policy: PolicyItem | null | undefined
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'saved'): void
}>()

const form = reactive({
  name: '',
  content: '',
})

const errors = reactive({
  name: '',
  content: '',
})

const submitting = ref(false)

const modalVisible = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})

const resetForm = () => {
  form.name = props.policy?.name ?? ''
  if (typeof props.policy?.content === 'object') {
    form.content = JSON.stringify(props.policy.content, null, 2)
  } else {
    form.content = props.policy?.content ? String(props.policy.content) : ''
  }
  clearErrors()
}

const clearErrors = () => {
  errors.name = ''
  errors.content = ''
}

watch(
  () => props.policy,
  () => {
    resetForm()
  },
  { immediate: true }
)

const closeModal = () => {
  emit('update:show', false)
  submitting.value = false
  resetForm()
}

const validate = () => {
  clearErrors()
  if (!form.name.trim()) {
    errors.name = t('Please enter policy name')
  }

  if (!form.content.trim()) {
    errors.content = t('Please enter policy content')
  } else {
    try {
      JSON.parse(form.content)
    } catch (error) {
      errors.content = t('Policy format invalid')
    }
  }

  return !errors.name && !errors.content
}

const submitForm = async () => {
  if (!validate()) {
    message.error(t('Please fill in the correct format'))
    return
  }

  submitting.value = true
  try {
    const payload = JSON.parse(form.content)
    await $api.put(`/add-canned-policy?name=${encodeURIComponent(form.name.trim())}`, payload)
    message.success(t('Saved'))
    closeModal()
    emit('saved')
  } catch (error) {
    console.error(error)
    message.error(t('Save Failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppModal
    v-model="modalVisible"
    :title="t('Policy Original')"
    size="lg"
    :close-on-backdrop="false"
  >
    <div class="space-y-4">
      <div class="grid gap-2">
        <Label for="policy-name">{{ t('Policy Name') }}</Label>
        <Input id="policy-name" v-model="form.name" autocomplete="off" />
        <p v-if="errors.name" class="text-sm text-destructive">{{ errors.name }}</p>
      </div>

      <div class="grid gap-2">
        <Label for="policy-content">{{ t('Policy Original') }}</Label>
        <div class="max-h-[60vh] overflow-auto rounded-md border">
          <json-editor id="policy-content" v-model="form.content" />
        </div>
        <p v-if="errors.content" class="text-sm text-destructive">{{ errors.content }}</p>
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
