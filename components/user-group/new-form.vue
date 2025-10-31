<script setup lang="ts">
import UserSelector from '@/components/user-selector.vue'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '~/components/modal.vue'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'search'): void
}>()

const { t } = useI18n()
const message = useMessage()
const { updateGroupMembers } = useGroups()

const defaultFormModel = () => ({
  group: '',
  members: [] as string[],
})

const formModel = reactive(defaultFormModel())
const submitting = ref(false)

const modalVisible = computed({
  get: () => props.visible,
  set: value => closeModal(value),
})

const closeModal = (visible = false) => {
  Object.assign(formModel, defaultFormModel())
  emit('update:visible', visible)
}

const submitForm = async () => {
  if (!formModel.group.trim()) {
    message.error(t('Please enter user group name'))
    return
  }

  submitting.value = true
  try {
    await updateGroupMembers({
      ...formModel,
      groupStatus: 'enabled',
      isRemove: false,
    })

    message.success(t('Add success'))
    closeModal()
    emit('search')
  } catch (error) {
    message.error(t('Add failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Modal v-model="modalVisible" :title="t('Add group members')" size="lg" :close-on-backdrop="false">
    <div class="space-y-6">
      <Field>
        <FieldLabel class="text-sm font-medium">{{ t('Name') }}</FieldLabel>
        <FieldContent>
          <Input v-model="formModel.group" autocomplete="off" />
        </FieldContent>
      </Field>

      <UserSelector v-model="formModel.members" :label="t('Users')" :placeholder="t('Select user group members')" />
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="closeModal()">
          {{ t('Cancel') }}
        </Button>
        <Button variant="default" :loading="submitting" @click="submitForm">
          {{ t('Submit') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>
