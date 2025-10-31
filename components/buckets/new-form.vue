<template>
  <Modal v-model="modalVisible" :title="t('Create Bucket')" size="lg" :close-on-backdrop="false">
    <div class="space-y-6">
      <Field>
        <FieldLabel for="bucket-name">{{ t('Please enter name') }}</FieldLabel>
        <FieldContent>
          <Input
            id="bucket-name"
            v-model="objectKey"
            autocomplete="off"
            :class="['w-full', showNameError && 'border-destructive focus-visible:ring-destructive']"
          />
        </FieldContent>
      </Field>

      <Field orientation="responsive" class="items-center">
        <FieldLabel>{{ t('Version') }}</FieldLabel>
        <FieldContent class="flex justify-end">
          <Switch v-model="version" />
        </FieldContent>
      </Field>

      <Field orientation="responsive" class="items-center">
        <FieldLabel>{{ t('Object Lock') }}</FieldLabel>
        <FieldContent class="flex justify-end">
          <Switch v-model="objectLock" />
        </FieldContent>
      </Field>

      <div v-if="objectLock" class="space-y-4 rounded-lg border p-4">
        <Field orientation="responsive" class="items-center">
          <FieldLabel>{{ t('Retention') }}</FieldLabel>
          <FieldContent class="flex justify-end">
            <Switch v-model="retentionEnabled" />
          </FieldContent>
        </Field>

        <div v-if="retentionEnabled" class="space-y-4">
          <Field>
            <FieldLabel>{{ t('Retention Mode') }}</FieldLabel>
            <FieldContent>
              <RadioGroup v-model="retentionMode" class="grid gap-2 sm:grid-cols-2">
                <label
                  v-for="option in retentionModeOptions"
                  :key="option.value"
                  class="flex items-start gap-3 rounded-md border border-border/50 p-3"
                >
                  <RadioGroupItem :value="option.value" class="mt-0.5" />
                  <span class="text-sm font-medium">{{ option.label }}</span>
                </label>
              </RadioGroup>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{{ t('Validity') }}</FieldLabel>
            <FieldContent>
              <div class="flex flex-col gap-2 sm:flex-row">
                <Input v-model="retentionPeriod" type="number" class="sm:w-32" />
                <RadioGroup v-model="retentionUnit" class="grid gap-2 sm:grid-cols-2">
                  <label
                    v-for="option in retentionUnitOptions"
                    :key="option.value"
                    class="flex items-start gap-3 rounded-md border border-border/50 p-3"
                  >
                    <RadioGroupItem :value="option.value" class="mt-0.5" />
                    <span class="text-sm font-medium">{{ option.label }}</span>
                  </label>
                </RadioGroup>
              </div>
            </FieldContent>
          </Field>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="closeModal">
          {{ t('Cancel') }}
        </Button>
        <Button variant="default" :loading="creating" :disabled="isSubmitDisabled" @click="handleCreateBucket">
          {{ t('Create') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '~/components/modal.vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const { t } = useI18n()
const message = useMessage()
const { createBucket, putBucketVersioning, putObjectLockConfiguration } = useBucket({})

const modalVisible = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})

const objectKey = ref('')
const version = ref(false)
const objectLock = ref(false)
const retentionEnabled = ref(false)
const retentionMode = ref<'COMPLIANCE' | 'GOVERNANCE'>('COMPLIANCE')
const retentionPeriod = ref('180')
const retentionUnit = ref<'day' | 'year'>('day')
const creating = ref(false)

watch(objectLock, (value: boolean) => {
  if (value) {
    version.value = true
  } else {
    retentionEnabled.value = false
  }
})

watch(version, (value: boolean) => {
  if (!value && objectLock.value) {
    objectLock.value = false
  }
})

const trimmedBucketName = computed(() => objectKey.value.trim())
const showNameError = computed(() => {
  if (!trimmedBucketName.value.length) return false
  return trimmedBucketName.value.length < 3 || trimmedBucketName.value.length > 63
})

const isSubmitDisabled = computed(() => {
  const length = trimmedBucketName.value.length
  return creating.value || length < 3 || length > 63
})

const retentionModeOptions = computed(() => [
  {
    label: t('COMPLIANCE'),
    value: 'COMPLIANCE',
  },
  {
    label: t('GOVERNANCE'),
    value: 'GOVERNANCE',
  },
])

const retentionUnitOptions = computed(() => [
  {
    label: t('Day'),
    value: 'day',
  },
  {
    label: t('Year'),
    value: 'year',
  },
])

const parsedRetentionPeriod = computed(() => {
  const value = Number.parseInt(retentionPeriod.value, 10)
  if (Number.isFinite(value) && value > 0) {
    return value
  }
  return 1
})

const resetForm = () => {
  objectKey.value = ''
  version.value = false
  objectLock.value = false
  retentionEnabled.value = false
  retentionMode.value = 'COMPLIANCE'
  retentionPeriod.value = '180'
  retentionUnit.value = 'day'
}

const closeModal = () => {
  emit('update:show', false)
  resetForm()
}

const handleCreateBucket = async () => {
  if (isSubmitDisabled.value) return

  const bucketName = trimmedBucketName.value
  creating.value = true

  try {
    await createBucket({
      Bucket: bucketName,
      ObjectLockEnabledForBucket: objectLock.value,
    })

    const applyRetention = async () => {
      if (objectLock.value && retentionEnabled.value) {
        await putObjectLockConfiguration(bucketName, {
          ObjectLockEnabled: 'Enabled',
          Rule: {
            DefaultRetention: {
              Mode: retentionMode.value,
              Days: retentionUnit.value === 'day' ? parsedRetentionPeriod.value : undefined,
              Years: retentionUnit.value === 'year' ? parsedRetentionPeriod.value : undefined,
            },
          },
        })
      }
    }

    if (version.value) {
      await putBucketVersioning(bucketName, 'Enabled')
    }

    try {
      await applyRetention()
    } catch {
      message.error(t('Retention Save Failed'))
    }

    message.success(t('Create Success'))
    closeModal()
  } catch (error: any) {
    message.error(error?.message || t('Create Failed'))
  } finally {
    creating.value = false
  }
}
</script>
