<template>
  <Drawer v-model="visible" :title="t('Object Details')" size="lg">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" @click="download">
          <Icon name="ri:download-line" class="size-4" />
          {{ t('Download') }}
        </Button>
        <Button variant="outline" size="sm" @click="openPreview">
          <Icon name="ri:eye-line" class="size-4" />
          {{ t('Preview') }}
        </Button>
        <Button variant="outline" size="sm" @click="() => (showTagView = true)">
          <Icon name="ri:price-tag-3-line" class="size-4" />
          {{ t('Set Tags') }}
        </Button>
        <Button variant="outline" size="sm" @click="viewVersions">
          <Icon name="ri:file-list-2-line" class="size-4" />
          {{ t('Versions') }}
        </Button>
        <Button v-if="lockStatus" variant="outline" size="sm" @click="() => (showRetentionView = true)">
          <Icon name="ri:lock-line" class="size-4" />
          {{ t('Retention') }}
        </Button>
      </div>

      <Item variant="outline" class="flex-col items-stretch gap-4">
        <ItemHeader class="items-center">
          <ItemTitle>{{ t('Info') }}</ItemTitle>
        </ItemHeader>
        <ItemContent class="space-y-3 text-sm">
          <TooltipProvider>
            <div class="flex items-center justify-between">
              <span class="font-medium text-muted-foreground">{{ t('Object Name') }}</span>
              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="max-w-[60%] truncate">{{ object?.Key }}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p class="max-w-xs break-all">{{ object?.Key }}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-medium text-muted-foreground">{{ t('Object Size') }}</span>
              <span>{{ object?.ContentLength }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-medium text-muted-foreground">{{ t('Object Type') }}</span>
              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="max-w-[60%] truncate">{{ object?.ContentType }}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p class="max-w-xs break-all">{{ object?.ContentType }}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          <div class="flex items-center justify-between">
            <span class="font-medium text-muted-foreground">ETag</span>
            <span>{{ object?.ETag }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-medium text-muted-foreground">{{ t('Last Modified Time') }}</span>
            <span>{{ object?.LastModified }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-medium text-muted-foreground">{{ t('Legal Hold') }}</span>
            <Switch :checked="lockStatus" @update:checked="toggleLegalHold" />
          </div>
          <div class="flex flex-col gap-2">
            <span class="font-medium text-muted-foreground">{{ t('Retention') + t('Policy') }}</span>
            <div class="flex flex-col gap-1">
              <span>{{ retention }}</span>
              <span v-if="retainUntilDate" class="text-xs text-muted-foreground">{{ retainUntilDate }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="font-medium text-muted-foreground">{{ t('Temporary URL Expiration') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-2">
                <Input
                  v-model.number="expirationDays"
                  type="number"
                  :min="0"
                  :max="7"
                  :placeholder="t('Days')"
                  class="w-20"
                  @input="validateAndUpdateExpiration"
                />
                <span class="text-sm text-muted-foreground">{{ t('Days') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <Input
                  v-model.number="expirationHours"
                  type="number"
                  :min="0"
                  :max="expirationDays > 0 ? 23 : 24"
                  :placeholder="t('Hours')"
                  class="w-20"
                  @input="validateAndUpdateExpiration"
                />
                <span class="text-sm text-muted-foreground">{{ t('Hours') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <Input
                  v-model.number="expirationMinutes"
                  type="number"
                  :min="0"
                  :max="59"
                  :placeholder="t('Minutes')"
                  class="w-20"
                  @input="validateAndUpdateExpiration"
                />
                <span class="text-sm text-muted-foreground">{{ t('Minutes') }}</span>
              </div>
              <Button
                class="ml-auto"
                variant="outline"
                size="sm"
                :disabled="!object?.Key || !isExpirationValid"
                @click="generateTemporaryUrl"
              >
                {{ t('Generate URL') }}
              </Button>
            </div>
            <div v-if="expirationError" class="text-xs text-destructive">{{ expirationError }}</div>
            <div v-if="totalExpirationSeconds > 0" class="text-xs text-muted-foreground">
              {{ t('Total Duration') }}: {{ formatDuration(totalExpirationSeconds) }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <copy-input v-model="signedUrl" class="w-full" :readonly="true" :copy-icon="true" />
          </div>
        </ItemContent>
      </Item>
    </div>

    <Modal v-model="showTagView" :title="t('Set Tags')" size="lg">
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <Badge v-for="tag in tags" :key="tag.Key" variant="secondary"> {{ tag.Key }}: {{ tag.Value }} </Badge>
        </div>
        <form class="space-y-4" @submit.prevent="submitTagForm">
          <div class="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{{ t('Tag Key') }}</FieldLabel>
              <FieldContent>
                <Input v-model="tagFormValue.Key" :placeholder="t('Tag Key Placeholder')" />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>{{ t('Tag Value') }}</FieldLabel>
              <FieldContent>
                <Input v-model="tagFormValue.Value" :placeholder="t('Tag Value Placeholder')" />
              </FieldContent>
            </Field>
          </div>
          <div class="flex justify-end">
            <Button type="submit" variant="default">{{ t('Add') }}</Button>
          </div>
        </form>
      </div>
    </Modal>

    <Modal v-model="showRetentionView" :title="t('Retention')" size="lg">
      <div class="space-y-4">
        <form class="flex flex-col gap-3" @submit.prevent="submitRetention">
          <Field>
            <FieldLabel>{{ t('Retention Mode') }}</FieldLabel>
            <FieldContent>
              <RadioGroup v-model="retentionMode" class="grid gap-2 sm:grid-cols-2">
                <label
                  v-for="option in [
                    { label: t('COMPLIANCE'), value: 'COMPLIANCE' },
                    { label: t('GOVERNANCE'), value: 'GOVERNANCE' },
                  ]"
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
            <FieldLabel>{{ t('Retention RetainUntilDate') }}</FieldLabel>
            <FieldContent>
              <Input v-model="retainUntilDate" type="datetime-local" />
            </FieldContent>
          </Field>
          <div class="flex justify-end gap-2">
            <Button variant="secondary" @click="resetRetention">{{ t('Reset') }}</Button>
            <Button type="submit" variant="default">{{ t('Confirm') }}</Button>
            <Button variant="outline" @click="() => (showRetentionView = false)">{{ t('Cancel') }}</Button>
          </div>
        </form>
      </div>
    </Modal>

    <object-preview-modal v-model:show="showPreview" :object="previewObject ?? object" />
    <ObjectVersions
      :bucket-name="bucketName"
      :object-key="object?.Key || ''"
      :visible="showVersions"
      @close="handleVersionsClose"
      @preview="handlePreviewVersion"
      @refresh-parent="handleVersionsRefresh"
    />
  </Drawer>
</template>

<script setup lang="ts">
import { useNuxtApp } from '#app'
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl as presignGetObject } from '@aws-sdk/s3-request-presigner'
import { joinRelativeURL } from 'ufo'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ObjectVersions from '@/components/object/versions.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Item, ItemContent, ItemHeader, ItemTitle } from '@/components/ui/item'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Drawer from '~/components/drawer.vue'
import Modal from '~/components/modal.vue'

const { t } = useI18n()
const message = useMessage()
const { $s3Client } = useNuxtApp()

const props = defineProps<{
  bucketName: string
}>()

const visible = ref(false)
const object = ref<any>(null)
const tags = ref<Array<{ Key: string; Value: string }>>([])
const lockStatus = ref(false)
const retention = ref('')
const retainUntilDate = ref('')
const retentionMode = ref<'COMPLIANCE' | 'GOVERNANCE'>('GOVERNANCE')
const signedUrl = ref('')
const showTagView = ref(false)
const showRetentionView = ref(false)
const showPreview = ref(false)
const showVersions = ref(false)
const previewObject = ref<any | null>(null)

const tagFormValue = ref({ Key: '', Value: '' })

const {
  getObjectInfo,
  setLegalHold,
  putObjectTags,
  getObjectTags,
  getObjectRetention,
  putObjectRetention,
  getSignedUrl,
} = useObject({
  bucket: props.bucketName,
})

const openDrawer = async (_bucket: string, key: string) => {
  visible.value = true
  try {
    await loadObjectInfo(key)
    await fetchTags(key)
    await fetchRetention(key)
  } catch (error) {
    message.error(t('Failed to fetch object info'))
  }
}
// 有效期输入（天数、小时、分钟）
const expirationDays = ref<number>(0)
const expirationHours = ref<number>(0)
const expirationMinutes = ref<number>(0)
const expirationError = ref<string>('')
const totalExpirationSeconds = ref<number>(0)
const isExpirationValid = ref<boolean>(false)

// 一周的秒数
const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60 // 604800

// 计算总时长（秒数）
const calculateTotalSeconds = (days: number, hours: number, minutes: number): number => {
  return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60
}

// 验证有效期输入
const validateExpiration = (): boolean => {
  expirationError.value = ''

  // 处理空值和非数字值，转换为0
  const days = Number(expirationDays.value) || 0
  const hours = Number(expirationHours.value) || 0
  const minutes = Number(expirationMinutes.value) || 0

  // 检查是否为有效数字
  if (isNaN(days) || isNaN(hours) || isNaN(minutes)) {
    return false
  }

  // 检查分钟范围 (0-59)
  if (minutes < 0 || minutes > 59) {
    expirationError.value = t('Minutes must be between 0 and 59')
    return false
  }

  // 检查小时范围
  if (hours < 0) {
    expirationError.value = t('Hours must be between 0 and 23')
    return false
  }

  // 如果天数大于0，小时不能超过23
  if (days > 0 && hours > 23) {
    expirationError.value = t('Hours must be between 0 and 23')
    return false
  }

  // 如果天数为0，小时不能超过24
  if (days === 0 && hours > 24) {
    expirationError.value = t('Hours must be between 0 and 24 when days is 0')
    return false
  }

  // 检查天数范围 (0-7)
  if (days < 0 || days > 7) {
    expirationError.value = t('Days must be between 0 and 7')
    return false
  }

  // 如果小时为24，自动转换为1天0小时（在计算时处理）
  let finalDays = days
  let finalHours = hours
  if (hours === 24 && days === 0) {
    finalDays = 1
    finalHours = 0
  }

  // 计算总时长
  const totalSeconds = calculateTotalSeconds(finalDays, finalHours, minutes)

  // 检查总时长不能超过一周
  if (totalSeconds > ONE_WEEK_SECONDS) {
    expirationError.value = t('Total duration cannot exceed 7 days')
    return false
  }

  // 检查至少有一个值大于0
  if (totalSeconds === 0) {
    return false
  }

  totalExpirationSeconds.value = totalSeconds
  return true
}

// 验证并更新有效期
const validateAndUpdateExpiration = () => {
  isExpirationValid.value = validateExpiration()
}

// 格式化时长显示
const formatDuration = (seconds: number): string => {
  if (seconds === 0) return ''

  const days = Math.floor(seconds / (24 * 60 * 60))
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((seconds % (60 * 60)) / 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days} ${t('Days')}`)
  if (hours > 0) parts.push(`${hours} ${t('Hours')}`)
  if (minutes > 0) parts.push(`${minutes} ${t('Minutes')}`)

  return parts.join(' ')
}

// 生成临时链接
const generateTemporaryUrl = async () => {
  if (!object.value?.Key) return

  if (!validateExpiration()) {
    message.error(expirationError.value || t('Please enter a valid expiration time'))
    return
  }

  try {
    const url = await getSignedUrl(object.value.Key, totalExpirationSeconds.value)
    signedUrl.value = url
    message.success(t('URL generated successfully'))
  } catch (error: any) {
    message.error(error?.message || t('Failed to generate URL'))
  }
}

const loadObjectInfo = async (key: string) => {
  const info = await getObjectInfo(key)
  object.value = info
  lockStatus.value = info?.ObjectLockLegalHoldStatus === 'ON'
  // 默认不生成分享链接，重置有效期输入
  expirationDays.value = 0
  expirationHours.value = 0
  expirationMinutes.value = 0
  signedUrl.value = ''
  expirationError.value = ''
  totalExpirationSeconds.value = 0
  isExpirationValid.value = false
}

const fetchTags = async (key: string) => {
  try {
    const response = await getObjectTags(key)
    tags.value = response
  } catch (error) {
    tags.value = []
  }
}

const fetchRetention = async (key: string) => {
  try {
    const response = await getObjectRetention(key)
    retention.value = response.Mode ?? ''
    retainUntilDate.value = response.RetainUntilDate ?? ''
    retentionMode.value = response.Mode === 'COMPLIANCE' ? 'COMPLIANCE' : 'GOVERNANCE'
  } catch (error) {
    retention.value = ''
    retainUntilDate.value = ''
  }
}

const toggleLegalHold = async () => {
  if (!object.value) return
  try {
    await setLegalHold(object.value.Key, !lockStatus.value)
    lockStatus.value = !lockStatus.value
    message.success(t('Update Success'))
  } catch (error: any) {
    message.error(error?.message || t('Update Failed'))
  }
}

const submitTagForm = async () => {
  if (!object.value) return
  if (!tagFormValue.value.Key || !tagFormValue.value.Value) {
    message.error(t('Please fill in the correct format'))
    return
  }

  try {
    const nextTags = [...tags.value, { ...tagFormValue.value }]
    await putObjectTags(object.value.Key, nextTags)
    tags.value = nextTags
    tagFormValue.value = { Key: '', Value: '' }
    message.success(t('Create Success'))
  } catch (error: any) {
    message.error(error?.message || t('Create Failed'))
  }
}

const submitRetention = async () => {
  if (!object.value) return
  try {
    await putObjectRetention(object.value.Key, {
      Mode: retentionMode.value,
      RetainUntilDate: retainUntilDate.value || undefined,
    })
    message.success(t('Update Success'))
    showRetentionView.value = false
    fetchRetention(object.value.Key)
  } catch (error: any) {
    message.error(error?.message || t('Update Failed'))
  }
}

const resetRetention = async () => {
  if (!object.value) return
  try {
    await putObjectRetention(object.value.Key, { Mode: 'GOVERNANCE' })
    message.success(t('Update Success'))
    fetchRetention(object.value.Key)
  } catch (error: any) {
    message.error(error?.message || t('Update Failed'))
  }
}

const viewVersions = () => {
  if (!object.value) return
  showVersions.value = true
}

const openPreview = () => {
  const source = object.value
  if (!source) return
  previewObject.value = source
  showPreview.value = true
}

const handlePreviewVersion = async (versionId: string) => {
  if (!object.value?.Key) return
  try {
    const [head, signed] = await Promise.all([
      $s3Client.send(
        new HeadObjectCommand({
          Bucket: props.bucketName,
          Key: object.value.Key,
          VersionId: versionId == '00000000-0000-0000-0000-000000000000' ? undefined : versionId,
        })
      ),
      presignGetObject(
        $s3Client,
        new GetObjectCommand({
          Bucket: props.bucketName,
          Key: object.value.Key,
          VersionId: versionId == '00000000-0000-0000-0000-000000000000' ? undefined : versionId,
        }),
        { expiresIn: 3600 }
      ),
    ])
    previewObject.value = {
      ...head,
      Key: object.value.Key,
      SignedUrl: signed,
      VersionId: versionId == '00000000-0000-0000-0000-000000000000' ? undefined : versionId,
    }
    showPreview.value = true
  } catch (error: any) {
    message.error(error?.message || t('Failed to fetch versions'))
  }
}

const handleVersionsClose = () => {
  showVersions.value = false
}

const handleVersionsRefresh = async () => {
  if (!object.value?.Key) return
  try {
    await loadObjectInfo(object.value.Key)
  } catch (error: any) {
    message.error(error?.message || t('Failed to fetch object info'))
  }
}

watch(
  () => showPreview.value,
  value => {
    if (!value) previewObject.value = null
  }
)

const download = async () => {
  if (!object.value) return
  try {
    const url = await getSignedUrl(object.value.Key)
    fetch(url).then(async response => {
      // 获取头信息，将 Headers 对象转换为普通对象
      const headers: any = {
        'content-type': response.headers.get('content-type') || 'application/octet-stream',
        filename: response.headers.get('content-disposition')?.split('filename=')[1] || '',
      }
      let blob = await response.blob()
      exportFile({ headers, data: blob }, object.value.Key.split('/').pop() || '')
    })
  } catch (error: any) {
    message.error(error?.message || t('Download Failed'))
  }
}

defineExpose({
  openDrawer,
})
</script>
