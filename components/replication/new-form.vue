<template>
  <Modal
    v-model="visible"
    :title="t('Add Replication Rule') + ` (${t('Bucket')}: ${bucketName || ''})`"
    size="xl"
    :close-on-backdrop="false"
  >
    <div class="space-y-6">
      <div class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel>{{ t('Priority') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.level" type="number" min="1" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Mode') }}</FieldLabel>
            <FieldContent>
              <Selector v-model="formData.modeType" :options="modeOptions" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Endpoint') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.endpoint" :placeholder="t('Please enter endpoint')" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Bucket') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.bucket" :placeholder="t('Please enter bucket')" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Access Key') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.accesskey" :placeholder="t('Please enter Access Key')" autocomplete="off" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Secret Key') }}</FieldLabel>
            <FieldContent>
              <Input
                v-model="formData.secrretkey"
                type="password"
                autocomplete="off"
                :placeholder="t('Please enter Secret Key')"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Region') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.region" :placeholder="t('Please enter region')" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Storage Class') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.storageType" :placeholder="t('Please enter storage class')" />
            </FieldContent>
          </Field>
        </div>

        <Field>
          <FieldLabel>{{ t('Prefix') }}</FieldLabel>
          <FieldContent>
            <Input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
          </FieldContent>
        </Field>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <FieldLabel class="text-sm font-medium">{{ t('Tags') }}</FieldLabel>
            <Button variant="outline" size="sm" @click="addTag">
              <Icon name="ri:add-line" class="size-4" />
              {{ t('Add Tag') }}
            </Button>
          </div>
          <div v-if="formData.tags.length" class="space-y-3">
            <div
              v-for="(tag, index) in formData.tags"
              :key="index"
              class="grid gap-2 rounded-md border p-3 md:grid-cols-2 md:items-center md:gap-4"
            >
              <Input v-model="tag.key" :placeholder="t('Tag Name')" />
              <div class="flex items-center gap-2">
                <Input v-model="tag.value" :placeholder="t('Tag Value')" class="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-destructive"
                  :disabled="formData.tags.length === 1"
                  @click="removeTag(index)"
                >
                  <Icon name="ri:delete-bin-line" class="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">{{ t('Use TLS') }}</p>
            <p class="text-xs text-muted-foreground">{{ t('Enable secure transport when connecting to endpoint.') }}</p>
          </div>
          <Switch v-model="formData.tls" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">{{ t('Replicate Existing Objects') }}</p>
            <p class="text-xs text-muted-foreground">
              {{ t('Include objects that already exist in the source bucket.') }}
            </p>
          </div>
          <Switch v-model="formData.existingObject" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">{{ t('Replicate Delete Markers') }}</p>
            <p class="text-xs text-muted-foreground">{{ t('Sync delete markers to destination bucket.') }}</p>
          </div>
          <Switch v-model="formData.expiredDeleteMark" />
        </div>

        <div class="space-y-3" v-if="formData.modeType === 'async'">
          <Field>
            <FieldLabel>{{ t('Health Check Interval (seconds)') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.timecheck" type="number" min="1" class="w-32" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Bandwidth Limit') }}</FieldLabel>
            <FieldContent>
              <div class="flex items-center gap-2">
                <Input v-model="formData.bandwidth" type="number" min="0" class="w-32" />
                <Selector v-model="formData.unit" :options="unitOptions" class="w-28" />
              </div>
            </FieldContent>
          </Field>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="handleCancel">{{ t('Cancel') }}</Button>
        <Button variant="default" :loading="submitting" @click="handleSave">{{ t('Save') }}</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Icon } from '#components'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { getBytes } from '@/utils/functions'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '~/components/modal.vue'
import Selector from '~/components/selector.vue'

const { t } = useI18n()
const message = useMessage()
const { setRemoteReplicationTarget, putBucketReplication, getBucketReplication } = useBucket({})

const props = defineProps<{
  bucketName: string | null
}>()

const emit = defineEmits<{
  (e: 'success'): void
}>()

const visible = ref(false)
const submitting = ref(false)

const formData = reactive({
  level: '1',
  endpoint: 'http://',
  tls: false,
  accesskey: '',
  secrretkey: '',
  bucket: '',
  region: 'us-east-1',
  modeType: 'async',
  timecheck: '60',
  unit: 'Gi',
  bandwidth: 100,
  storageType: 'STANDARD',
  prefix: '',
  tags: [{ key: '', value: '' }],
  existingObject: true,
  expiredDeleteMark: true,
})

watch(
  () => formData.tls,
  val => {
    if (val) {
      if (formData.endpoint.startsWith('http://')) {
        formData.endpoint = formData.endpoint.replace('http://', 'https://')
      } else if (!formData.endpoint.startsWith('https://')) {
        formData.endpoint = 'https://' + formData.endpoint
      }
    } else {
      if (formData.endpoint.startsWith('https://')) {
        formData.endpoint = formData.endpoint.replace('https://', 'http://')
      } else if (!formData.endpoint.startsWith('http://')) {
        formData.endpoint = 'http://' + formData.endpoint
      }
    }
  }
)

const modeOptions = computed(() => [
  { label: t('Asynchronous'), value: 'async' },
  { label: t('Synchronous'), value: 'sync' },
])

const unitOptions = computed(() => [
  { label: 'KiB/s', value: 'Ki' },
  { label: 'MiB/s', value: 'Mi' },
  { label: 'GiB/s', value: 'Gi' },
])

const addTag = () => {
  formData.tags.push({ key: '', value: '' })
}

const removeTag = (index: number) => {
  if (formData.tags.length === 1) return
  formData.tags.splice(index, 1)
}

const resetForm = () => {
  formData.level = '1'
  formData.endpoint = 'http://'
  formData.tls = false
  formData.accesskey = ''
  formData.secrretkey = ''
  formData.bucket = ''
  formData.region = 'us-east-1'
  formData.modeType = 'async'
  formData.timecheck = '60'
  formData.unit = 'Gi'
  formData.bandwidth = 100
  formData.storageType = 'STANDARD'
  formData.prefix = ''
  formData.tags = [{ key: '', value: '' }]
  formData.existingObject = true
  formData.expiredDeleteMark = true
}

const validate = () => {
  if (!formData.endpoint) {
    message.error(t('Please enter endpoint'))
    return false
  }
  if (!formData.bucket) {
    message.error(t('Please enter bucket'))
    return false
  }
  if (!formData.accesskey || !formData.secrretkey) {
    message.error(t('Please provide credentials'))
    return false
  }
  if (formData.modeType === 'async' && Number(formData.timecheck) < 1) {
    message.error(t('Please enter valid health check interval'))
    return false
  }
  return true
}

const handleSave = async () => {
  if (!validate()) return
  if (!props.bucketName) {
    message.error(t('Bucket name is required'))
    return
  }
  submitting.value = true
  try {
    const config: any = {
      sourcebucket: props.bucketName,
      endpoint: formData.endpoint,
      credentials: {
        accessKey: formData.accesskey,
        secretKey: formData.secrretkey,
        expiration: '0001-01-01T00:00:00Z',
      },
      targetbucket: formData.bucket,
      secure: formData.tls,
      region: formData.region,
      path: 'auto',
      api: 's3v4',
      type: 'replication',
      replicationSync: formData.modeType === 'sync',
      healthCheckDuration: Number(formData.timecheck) || 60,
      disableProxy: false,
      resetBeforeDate: '0001-01-01T00:00:00Z',
      totalDowntime: 0,
      lastOnline: '0001-01-01T00:00:00Z',
      isOnline: false,
      latency: { curr: 0, avg: 0, max: 0 },
      edge: false,
      edgeSyncBeforeExpiry: false,
    }

    if (formData.modeType === 'async') {
      config.bandwidth = Number(getBytes(String(formData.bandwidth), formData.unit, true)) || 0
    }

    const targetResponse = await setRemoteReplicationTarget(props.bucketName, config)
    if (!targetResponse) {
      // throw new Error('Failed to create replication target')
      return
    }

    let oldConfig: any = null
    try {
      oldConfig = await getBucketReplication(props.bucketName)
    } catch (error) {
      oldConfig = null
    }

    const newRule: any = {
      ID: `replication-rule-${Date.now()}`,
      Status: 'Enabled',
      Priority: Number.parseInt(formData.level) || 1,
      SourceSelectionCriteria: {
        SseKmsEncryptedObjects: { Status: 'Enabled' },
      },
      ExistingObjectReplication: {
        Status: formData.existingObject ? 'Enabled' : 'Disabled',
      },
      DeleteMarkerReplication: {
        Status: formData.expiredDeleteMark ? 'Enabled' : 'Disabled',
      },
      Destination: {
        Bucket: targetResponse,
        StorageClass: formData.storageType || 'STANDARD',
      },
    }

    const validTags = formData.tags.filter(tag => tag.key && tag.value)
    const filter: any = {}

    if (formData.prefix) {
      filter.Prefix = formData.prefix
    }

    if (validTags.length === 1) {
      const [singleTag] = validTags
      if (singleTag) {
        filter.Tag = { Key: singleTag.key, Value: singleTag.value }
      }
    } else if (validTags.length > 1) {
      filter.And = {
        ...(formData.prefix ? { Prefix: formData.prefix } : {}),
        Tags: validTags.map(tag => ({ Key: tag.key, Value: tag.value })),
      }
      delete filter.Prefix
    }

    if (Object.keys(filter).length > 0) {
      newRule.Filter = filter
    }

    const existingRules = oldConfig?.ReplicationConfiguration?.Rules ?? []
    const payload = {
      Role: targetResponse,
      Rules: [...existingRules.filter((rule: any) => rule.Destination?.Bucket !== targetResponse), newRule],
    }

    await putBucketReplication(props.bucketName, payload)
    message.success(t('Create Success'))
    emit('success')
    handleCancel()
  } catch (error: any) {
    console.error(error)
    message.error(error?.message || t('Save failed'))
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  visible.value = false
  submitting.value = false
  resetForm()
}

defineExpose({
  open: () => {
    resetForm()
    visible.value = true
  },
})
</script>
