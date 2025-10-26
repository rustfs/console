<template>
  <AppDrawer v-model="visible" :title="t('Object Details')" size="lg">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <AppButton variant="outline" size="sm" @click="download">
          <Icon name="ri:download-line" class="size-4" />
          {{ t('Download') }}
        </AppButton>
        <AppButton variant="outline" size="sm" @click="() => (showPreview = true)">
          <Icon name="ri:eye-line" class="size-4" />
          {{ t('Preview') }}
        </AppButton>
        <AppButton variant="outline" size="sm" @click="() => (showTagView = true)">
          <Icon name="ri:price-tag-3-line" class="size-4" />
          {{ t('Set Tags') }}
        </AppButton>
        <AppButton variant="outline" size="sm" @click="geVersions">
          <Icon name="ri:file-list-2-line" class="size-4" />
          {{ t('Versions') }}
        </AppButton>
        <AppButton
          v-if="lockStatus"
          variant="outline"
          size="sm"
          @click="() => (showRetentionView = true)"
        >
          <Icon name="ri:lock-line" class="size-4" />
          {{ t('Retention') }}
        </AppButton>
      </div>

      <AppCard :title="t('Info')" padded>
        <div class="space-y-3 text-sm">
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
            <AppSwitch :checked="lockStatus" @update:checked="toggleLegalHold" />
          </div>
          <div class="flex flex-col gap-2">
            <span class="font-medium text-muted-foreground">{{ t('Retention') + t('Policy') }}</span>
            <div class="flex flex-col gap-1">
              <span>{{ retention}}</span>
              <span v-if="retainUntilDate" class="text-xs text-muted-foreground">{{ retainUntilDate }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <AppInput v-model="signedUrl" id="signedUrl" :placeholder="t('Temporary URL')" />
            <AppButton variant="outline" size="sm" :disabled="!object?.Key" @click="copyTemporaryUrl">
              {{ t('Copy') }}
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <AppModal v-model="showTagView" :title="t('Set Tags')" size="lg">
      <AppCard class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <AppTag v-for="tag in tags" :key="tag.Key" tone="info">
            {{ tag.Key }}: {{ tag.Value }}
          </AppTag>
        </div>
        <form class="flex flex-wrap gap-3" @submit.prevent="submitTagForm">
          <AppInput v-model="tagFormValue.Key" :placeholder="t('Tag Key Placeholder')" />
          <AppInput v-model="tagFormValue.Value" :placeholder="t('Tag Value Placeholder')" />
          <AppButton type="submit" variant="primary">{{ t('Add') }}</AppButton>
        </form>
      </AppCard>
    </AppModal>

    <AppModal v-model="showRetentionView" :title="t('Retention')" size="lg">
      <AppCard class="space-y-4">
        <form class="flex flex-col gap-3" @submit.prevent="submitRetention">
          <div class="flex flex-col gap-2">
            <Label>{{ t('Retention Mode') }}</Label>
            <AppRadioGroup
              v-model="retentionMode"
              :options="[
                { label: t('COMPLIANCE'), value: 'COMPLIANCE' },
                { label: t('GOVERNANCE'), value: 'GOVERNANCE' },
              ]"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Label>{{ t('Retention RetainUntilDate') }}</Label>
            <AppInput v-model="retainUntilDate" type="datetime-local" />
          </div>
          <div class="flex justify-end gap-2">
            <AppButton variant="secondary" @click="resetRetention">{{ t('Reset') }}</AppButton>
            <AppButton type="submit" variant="primary">{{ t('Confirm') }}</AppButton>
            <AppButton variant="outline" @click="() => (showRetentionView = false)">{{ t('Cancel') }}</AppButton>
          </div>
        </form>
      </AppCard>
    </AppModal>

    <object-preview-modal v-model:show="showPreview" :object="object" />
  </AppDrawer>
</template>

<script setup lang="ts">
import { AppButton, AppCard, AppDrawer, AppInput, AppModal, AppRadioGroup, AppSwitch, AppTag } from '@/components/app'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { useI18n } from 'vue-i18n'
import { ref, computed } from 'vue'
import ClipboardJS from 'clipboard'
import { joinRelativeURL } from 'ufo'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const props = defineProps<{
  bucketName: string
}>()

const visible = ref(false)
const object = ref<any>(null)
const tags = ref<Array<{ Key: string; Value: string }>>([])
const lockStatus = ref(false)
const retention = ref('')
const retainUntilDate = ref('')
const retentionMode = ref('GOVERNANCE')
const signedUrl = ref('')
const showTagView = ref(false)
const showRetentionView = ref(false)
const showPreview = ref(false)

const tagFormValue = ref({ Key: '', Value: '' })

const { getObjectInfo, setLegalHold, putObjectTags, getObjectTags, getObjectRetention, putObjectRetention, geObjectVersions } =
  useObject({ bucket: props.bucketName })

const openDrawer = async (bucket: string, key: string) => {
  visible.value = true
  try {
    const info = await getObjectInfo(key)
    object.value = info
    lockStatus.value = info?.ObjectLockLegalHoldStatus === 'ON'
    signedUrl.value = info?.SignedUrl || ''
    await fetchTags(key)
    await fetchRetention(key)
  } catch (error) {
    message.error(t('Failed to fetch object info'))
  }
}

const fetchTags = async (key: string) => {
  try {
    const response = await getObjectTags(key)
    tags.value = response.TagSet || []
  } catch (error) {
    tags.value = []
  }
}

const fetchRetention = async (key: string) => {
  try {
    const response = await getObjectRetention(key)
    retention.value = response.Mode || ''
    retainUntilDate.value = response.RetainUntilDate || ''
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
      RetainUntilDate: retainUntilDate.value,
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
    await putObjectRetention(object.value.Key, { Mode: 'GOVERNANCE', RetainUntilDate: '' })
    message.success(t('Update Success'))
    fetchRetention(object.value.Key)
  } catch (error: any) {
    message.error(error?.message || t('Update Failed'))
  }
}

const geVersions = async () => {
  if (!object.value) return
  await geObjectVersions(object.value.Key)
}

const download = async () => {
  if (!object.value) return
  const url = joinRelativeURL('/browser', encodeURIComponent(props.bucketName), 'download', encodeURIComponent(object.value.Key))
  window.open(url, '_blank')
}

const copyTemporaryUrl = () => {
  const clipboard = new ClipboardJS('#signedUrl', {
    text: () => signedUrl.value,
  })
  clipboard.on('success', () => message.success(t('Copy Success')))
  clipboard.on('error', () => message.error(t('Copy Failed')))
  clipboard.destroy()
}

defineExpose({
  openDrawer,
})
</script>
