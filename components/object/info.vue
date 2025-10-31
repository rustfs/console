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
          <div class="flex items-center justify-between">
            <span class="font-medium text-muted-foreground">{{ t('Object Name') }}</span>
            <span>{{ object?.Key }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-medium text-muted-foreground">{{ t('Object Size') }}</span>
            <span>{{ object?.ContentLength }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-medium text-muted-foreground">{{ t('Object Type') }}</span>
            <span>{{ object?.ContentType }}</span>
          </div>
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
          <div class="flex items-center gap-2">
            <Input v-model="signedUrl" :placeholder="t('Temporary URL')" readonly />
            <Button variant="outline" size="sm" :disabled="!object?.Key" @click="copyTemporaryUrl">
              {{ t('Copy') }}
            </Button>
          </div>
        </ItemContent>
      </Item>
    </div>

    <Modal v-model="showTagView" :title="t('Set Tags')" size="lg">
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <Badge v-for="tag in tags" :key="tag.Key" variant="secondary">
            {{ tag.Key }}: {{ tag.Value }}
          </Badge>
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
              <v-radio-group v-model="retentionMode" :options="[
                { label: t('COMPLIANCE'), value: 'COMPLIANCE' },
                { label: t('GOVERNANCE'), value: 'GOVERNANCE' },
              ]" />
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
    <ObjectVersions :bucket-name="bucketName" :object-key="object?.Key || ''" :visible="showVersions" @close="handleVersionsClose" @preview="handlePreviewVersion"
      @refresh-parent="handleVersionsRefresh" />
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
import { Switch } from '@/components/ui/switch'
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

const { getObjectInfo, setLegalHold, putObjectTags, getObjectTags, getObjectRetention, putObjectRetention } = useObject({
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

const loadObjectInfo = async (key: string) => {
  const info = await getObjectInfo(key)
  object.value = info
  lockStatus.value = info?.ObjectLockLegalHoldStatus === 'ON'
  signedUrl.value = info?.SignedUrl || ''
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

const openPreview = (target?: any) => {
  const source = target ?? object.value
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
          VersionId: versionId,
        })
      ),
      presignGetObject(
        $s3Client,
        new GetObjectCommand({
          Bucket: props.bucketName,
          Key: object.value.Key,
          VersionId: versionId,
        }),
        { expiresIn: 3600 }
      ),
    ])
    previewObject.value = {
      ...head,
      Key: object.value.Key,
      SignedUrl: signed,
      VersionId: versionId,
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
  const url = joinRelativeURL('/browser', encodeURIComponent(props.bucketName), 'download', encodeURIComponent(object.value.Key))
  window.open(url, '_blank')
}

const copyTemporaryUrl = async () => {
  if (!signedUrl.value) return
  try {
    await navigator.clipboard.writeText(signedUrl.value)
    message.success(t('Copy Success'))
  } catch {
    message.error(t('Copy Failed'))
  }
}

defineExpose({
  openDrawer,
})
</script>
