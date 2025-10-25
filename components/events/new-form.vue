<template>
  <Dialog :open="visible" @update:open="handleOpenChange">
    <DialogContent
      class="max-w-2xl"
      @pointerDownOutside.prevent
      @interactOutside.prevent
      @escapeKeyDown.prevent
    >
      <DialogHeader class="text-left">
        <DialogTitle>
          {{ t('Subscribe to event notification') }}
          <span class="block text-sm font-normal text-muted-foreground">
            {{ `${t('Bucket')}: ${bucketName}` }}
          </span>
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
          <Label for="event-resource-name">{{ t('Amazon Resource Name') }}</Label>
          <Select
            id="event-resource-name"
            v-model="formData.resourceName"
            :disabled="!arnList.length"
          >
            <SelectTrigger>
              <SelectValue :placeholder="t('Please select resource name')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="item in arnList"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="errors.resourceName" class="sm:col-start-2 text-sm text-destructive">
            {{ errors.resourceName }}
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
          <Label for="event-prefix">{{ t('Prefix') }}</Label>
          <Input
            id="event-prefix"
            v-model="formData.prefix"
            :placeholder="t('Please enter prefix')"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
          <Label for="event-suffix">{{ t('Suffix') }}</Label>
          <Input
            id="event-suffix"
            v-model="formData.suffix"
            :placeholder="t('Please enter suffix')"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-[160px_1fr]">
          <Label>{{ t('Select events') }}</Label>
          <div class="space-y-2">
            <ScrollArea class="max-h-64 rounded-md border">
              <div class="flex flex-col gap-2 p-4">
                <label
                  v-for="event in eventOptions"
                  :key="event.value"
                  class="flex items-start gap-3"
                >
                  <Checkbox
                    :checked="formData.events.includes(event.value)"
                    class="mt-1"
                    @update:checked="value => toggleEvent(event.value, value)"
                  />
                  <span>{{ t(event.labelKey) }}</span>
                </label>
              </div>
            </ScrollArea>
            <p v-if="errors.events" class="text-sm text-destructive">
              {{ errors.events }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2 pt-6 sm:flex-row sm:justify-center">
        <Button type="button" variant="outline" @click="handleCancel">
          {{ t('Cancel') }}
        </Button>
        <Button type="button" @click="handleSubmit">
          {{ t('Save') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { getEventTargetArnList } = useEventTarget()
const { putBucketNotifications, listBucketNotifications } = useBucket({})
const { t } = useI18n()
const message = useMessage()

interface FormData {
  resourceName: string
  prefix: string
  suffix: string
  events: string[]
}

interface ArnOption {
  label: string
  value: string
}

const props = defineProps({
  bucketName: {
    type: String,
    required: true,
  },
})

const emit = defineEmits<{
  success: []
}>()

const visible = ref(false)

const formData = ref<FormData>({
  resourceName: '',
  prefix: '',
  suffix: '',
  events: [],
})

const errors = reactive({
  resourceName: '',
  events: '',
})

const eventOptions = [
  { value: 'PUT', labelKey: 'PUT - Object upload' },
  { value: 'GET', labelKey: 'GET - Object access' },
  { value: 'DELETE', labelKey: 'DELETE - Object deletion' },
  { value: 'REPLICA', labelKey: 'REPLICA - Object migration' },
  { value: 'RESTORE', labelKey: 'ILM - Object converted' },
  {
    value: 'SCANNER',
    labelKey: 'SCANNER - Object has too many versions/prefix has too many subfolders',
  },
]

const arnList = ref<ArnOption[]>([])

getEventTargetArnList().then((res: string[]) => {
  arnList.value = res.map(item => ({
    label: item,
    value: item,
  }))
})

const open = () => {
  visible.value = true
}

const handleOpenChange = (value: boolean) => {
  visible.value = value
  if (!value) {
    resetForm()
  }
}

const resetForm = () => {
  formData.value = {
    resourceName: '',
    prefix: '',
    suffix: '',
    events: [],
  }
  errors.resourceName = ''
  errors.events = ''
}

const toggleEvent = (event: string, value: boolean | 'indeterminate') => {
  const checked = value === true || value === 'indeterminate'
  if (checked && !formData.value.events.includes(event)) {
    formData.value.events.push(event)
  } else if (!checked) {
    formData.value.events = formData.value.events.filter(item => item !== event)
  }
}

const validate = () => {
  errors.resourceName = formData.value.resourceName ? '' : t('Please select resource name')
  errors.events = formData.value.events.length ? '' : t('Please select at least one event')
  return !errors.resourceName && !errors.events
}

const handleSubmit = async () => {
  if (!validate()) {
    return
  }

  try {
    const eventMapping: Record<string, string[]> = {
      PUT: ['s3:0bjectCreated:*'],
      GET: ['s3:0bjectAccessed:*'],
      DELETE: ['s3:0bjectRemoved:*'],
      REPLICA: ['s3:Replication:*'],
      RESTORE: ['s3:ObjectRestore:*', 's3:0bjectTransition:*'],
      SCANNER: ['s3:Scanner:ManyVersions', 's3:Scanner:BigPrefix'],
    }

    const s3Events: string[] = []
    formData.value.events.forEach(event => {
      if (eventMapping[event]) {
        s3Events.push(...eventMapping[event])
      } else {
        s3Events.push(event)
      }
    })

    const uniqueS3Events = [...new Set(s3Events)]

    if (!uniqueS3Events.length) {
      message.error(t('No valid events found after conversion'))
      return
    }

    let currentNotifications: any = {}
    try {
      const currentResponse = await listBucketNotifications(props.bucketName)
      currentNotifications = currentResponse || {}
    } catch (error) {
      console.warn('获取当前通知配置失败，将使用空配置:', error)
      currentNotifications = {}
    }

    const arn = formData.value.resourceName
    const newNotificationConfig: {
      LambdaFunctionConfigurations?: any[]
      QueueConfigurations?: any[]
      TopicConfigurations?: any[]
    } = {}

    const baseConfig: {
      Id: string
      Events: string[]
      Filter?: {
        Key: {
          FilterRules: Array<{ Name: string; Value: string }>
        }
      }
    } = {
      Id: `notification-${Date.now()}`,
      Events: uniqueS3Events,
      Filter: {
        Key: {
          FilterRules: [],
        },
      },
    }

    if (formData.value.prefix) {
      baseConfig.Filter!.Key.FilterRules.push({
        Name: 'Prefix',
        Value: formData.value.prefix,
      })
    }

    if (formData.value.suffix) {
      baseConfig.Filter!.Key.FilterRules.push({
        Name: 'Suffix',
        Value: formData.value.suffix,
      })
    }

    if (!baseConfig.Filter!.Key.FilterRules.length) {
      delete baseConfig.Filter
    }

    if (arn.includes(':lambda:')) {
      newNotificationConfig.LambdaFunctionConfigurations = [
        {
          ...baseConfig,
          LambdaFunctionArn: arn,
        },
      ]
    } else if (arn.includes(':sqs:')) {
      newNotificationConfig.QueueConfigurations = [
        {
          ...baseConfig,
          QueueArn: arn,
        },
      ]
    } else if (arn.includes(':sns:')) {
      newNotificationConfig.TopicConfigurations = [
        {
          ...baseConfig,
          TopicArn: arn,
        },
      ]
    } else {
      newNotificationConfig.TopicConfigurations = [
        {
          ...baseConfig,
          TopicArn: arn,
        },
      ]
    }

    const mergedNotificationConfig = {
      ...currentNotifications,
      ...newNotificationConfig,
    }

    if (newNotificationConfig.LambdaFunctionConfigurations) {
      mergedNotificationConfig.LambdaFunctionConfigurations = [
        ...(currentNotifications.LambdaFunctionConfigurations || []),
        ...newNotificationConfig.LambdaFunctionConfigurations,
      ]
    }

    if (newNotificationConfig.QueueConfigurations) {
      mergedNotificationConfig.QueueConfigurations = [
        ...(currentNotifications.QueueConfigurations || []),
        ...newNotificationConfig.QueueConfigurations,
      ]
    }

    if (newNotificationConfig.TopicConfigurations) {
      mergedNotificationConfig.TopicConfigurations = [
        ...(currentNotifications.TopicConfigurations || []),
        ...newNotificationConfig.TopicConfigurations,
      ]
    }

    await putBucketNotifications(props.bucketName, mergedNotificationConfig)

    message.success(t('Create Success'))
    visible.value = false
    emit('success')
    resetForm()
  } catch (error) {
    console.error('创建 bucket notification 失败:', error)
    message.error(t('Create Failed'))
  }
}

const handleCancel = () => {
  visible.value = false
  resetForm()
}

defineExpose({
  open,
})
</script>
