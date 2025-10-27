<template>
  <AppModal
    v-model="visible"
    :title="formData.type ? t('Add {type} Destination', { type: formData.type }) : t('Add Event Destination')"
    size="lg"
    :close-on-backdrop="false"
  >
    <div class="space-y-6">
      <div v-if="!formData.type" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AppCard
          v-for="option in typeOptions"
          :key="option.value"
          class="cursor-pointer border border-border/70 transition hover:border-primary"
          @click="chooseType(option.value)"
        >
          <div class="flex items-center gap-3">
            <img :src="option.iconUrl" class="h-10 w-10" alt="" />
            <div>
              <p class="text-base font-semibold">{{ option.label }}</p>
              <p class="text-sm text-muted-foreground">{{ option.description }}</p>
            </div>
          </div>
        </AppCard>
      </div>

      <div v-else class="space-y-4">
        <AppCard
          class="flex cursor-pointer items-center gap-3 border transition hover:border-primary"
          @click="resetType"
        >
          <img :src="iconUrl" class="h-10 w-10" alt="" />
          <div class="flex flex-col">
            <span class="text-sm text-muted-foreground">{{ t('Selected Type') }}</span>
            <span class="text-base font-semibold">{{ formData.type }}</span>
          </div>
        </AppCard>

        <div class="grid gap-4">
          <div class="grid gap-2">
            <Label for="target-name">{{ t('Name') }} (A-Z,0-9,_)</Label>
            <Input
              id="target-name"
              v-model="formData.name"
              :placeholder="t('Please enter name')"
              autocomplete="off"
              @input="validateNameFormat"
            />
            <p v-if="errors.name" class="text-sm text-destructive">{{ errors.name }}</p>
          </div>

          <div
            v-for="config in currentConfigOptions"
            :key="config.name"
            class="grid gap-2"
          >
            <Label :for="`config-${config.name}`">{{ config.label }}</Label>
            <Input
              v-if="config.type === 'text'"
              :id="`config-${config.name}`"
              v-model="formData.config[config.name]"
              :placeholder="`${t('Please enter')} ${config.label.toLowerCase()}`"
            />
            <Input
              v-else-if="config.type === 'password'"
              :id="`config-${config.name}`"
              v-model="formData.config[config.name]"
              type="password"
              autocomplete="off"
              :placeholder="`${t('Please enter')} ${config.label.toLowerCase()}`"
            />
            <Input
              v-else-if="config.type === 'number'"
              :id="`config-${config.name}`"
              v-model="formData.config[config.name]"
              type="number"
              :placeholder="`${t('Please enter')} ${config.label.toLowerCase()}`"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="handleCancel">{{ t('Cancel') }}</Button>
        <Button variant="default" :loading="submitting" :disabled="!formData.type" @click="handleSave">
          {{ t('Save') }}
        </Button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { useI18n } from 'vue-i18n'
import MqttIcon from '~/assets/svg/mqtt.svg'
import WebhooksIcon from '~/assets/svg/webhooks.svg'
import { AppCard, AppModal } from '@/components/app'
import { Label } from '@/components/ui/label'
import { computed, reactive, ref, watch } from 'vue'
import { useEventTarget } from '#imports'

const { t } = useI18n()
const { updateEventTarget } = useEventTarget()
const message = useMessage()

const typeOptions = [
  { label: t('MQTT'), value: 'MQTT', iconUrl: MqttIcon, description: t('Send events via MQTT broker') },
  { label: t('Webhook'), value: 'Webhook', iconUrl: WebhooksIcon, description: t('Trigger custom HTTP endpoints') },
]

const configOptions: Record<string, Array<{ label: string; name: string; type: 'text' | 'password' | 'number' }>> = {
  MQTT: [
    { label: t('MQTT_BROKER'), name: 'broker', type: 'text' },
    { label: t('MQTT_TOPIC'), name: 'topic', type: 'text' },
    { label: t('MQTT_USERNAME'), name: 'username', type: 'text' },
    { label: t('MQTT_PASSWORD'), name: 'password', type: 'password' },
    { label: t('MQTT_QOS'), name: 'qos', type: 'number' },
    { label: t('MQTT_RECONNECT_INTERVAL'), name: 'reconnect_interval', type: 'number' },
    { label: t('MQTT_KEEP_ALIVE_INTERVAL'), name: 'keep_alive_interval', type: 'number' },
    { label: t('MQTT_QUEUE_DIR'), name: 'queue_dir', type: 'text' },
    { label: t('MQTT_QUEUE_LIMIT'), name: 'queue_limit', type: 'number' },
    { label: t('COMMENT_KEY'), name: 'comment', type: 'text' },
  ],
  Webhook: [
    { label: t('WEBHOOK_ENDPOINT'), name: 'endpoint', type: 'text' },
    { label: t('WEBHOOK_AUTH_TOKEN'), name: 'auth_token', type: 'text' },
    { label: t('WEBHOOK_QUEUE_LIMIT'), name: 'queue_limit', type: 'number' },
    { label: t('WEBHOOK_QUEUE_DIR'), name: 'queue_dir', type: 'text' },
    { label: t('COMMENT_KEY'), name: 'comment', type: 'text' },
  ],
}

const visible = ref(false)
const submitting = ref(false)

const formData = reactive({
  type: '',
  name: '',
  config: {} as Record<string, string | number>,
})

const errors = reactive({
  name: '',
})

const currentConfigOptions = computed(() => (formData.type ? configOptions[formData.type] ?? [] : []))

watch(
  () => formData.type,
  newType => {
    if (newType && configOptions[newType]) {
      const nextConfig: Record<string, string | number> = {}
      configOptions[newType].forEach(item => {
        nextConfig[item.name] = ''
      })
      formData.config = nextConfig
    }
  }
)

const iconUrl = computed(() => {
  return typeOptions.find(item => item.value === formData.type)?.iconUrl || ''
})

const chooseType = (type: string) => {
  formData.type = type
}

const resetType = () => {
  formData.type = ''
  formData.name = ''
  formData.config = {}
  clearErrors()
}

const clearErrors = () => {
  errors.name = ''
}

const validateNameFormat = () => {
  if (!formData.name) {
    errors.name = t('Please enter name')
    return
  }

  if (!/^[A-Za-z0-9_]+$/.test(formData.name)) {
    errors.name = t('Please enter name') + ' (A-Z,0-9,_)'
  } else {
    errors.name = ''
  }
}

const validateForm = () => {
  validateNameFormat()

  if (!formData.type) {
    message.error(t('Please select event target type'))
    return false
  }

  if (errors.name) {
    message.error(errors.name)
    return false
  }

  const hasConfig = Object.values(formData.config).some(value => value !== '' && value !== null && value !== undefined)
  if (!hasConfig) {
    message.error(t('Please fill in at least one configuration item'))
    return false
  }

  return true
}

const handleSave = async () => {
  if (!validateForm()) {
    return
  }

  submitting.value = true
  try {
    const targetType = formData.type === 'MQTT' ? 'notify_mqtt' : 'notify_webhook'
    const targetName = formData.name
    const keyValues = Object.entries(formData.config).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }))

    const payload = { key_values: keyValues }

    await updateEventTarget(targetType, targetName, payload)
    message.success(t('Event Target created successfully'))
    emitSearch()
    handleCancel()
  } catch (error) {
    console.error(error)
    message.error(t('Failed to create event target'))
  } finally {
    submitting.value = false
  }
}

const emit = defineEmits<{
  (e: 'search'): void
}>()

const emitSearch = () => emit('search')

const handleCancel = () => {
  visible.value = false
  resetType()
}

defineExpose({
  open: () => {
    visible.value = true
    resetType()
  },
})
</script>