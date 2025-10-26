<template>
  <div class="space-y-4">
    <AppCard padded class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-col">
          <h2 class="text-lg font-semibold">{{ object?.Key }}</h2>
          <p class="text-sm text-muted-foreground">{{ t('Object Detail Description', { bucket: bucketName }) }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AppButton variant="outline" size="sm" @click="download">
            <Icon name="ri:download-line" class="size-4" />
            {{ t('Download') }}
          </AppButton>
          <AppButton variant="outline" size="sm" @click="copySignedUrl">
            <Icon name="ri:file-copy-line" class="size-4" />
            {{ t('Copy Temporary URL') }}
          </AppButton>
          <AppButton variant="outline" size="sm" @click="() => (showPreview = true)">
            <Icon name="ri:eye-line" class="size-4" />
            {{ t('Preview') }}
          </AppButton>
          <AppButton variant="outline" size="sm" @click="() => (showTagView = true)">
            <Icon name="ri:price-tag-3-line" class="size-4" />
            {{ t('Set Tags') }}
          </AppButton>
          <AppButton variant="destructive" size="sm" @click="confirmDelete">
            <Icon name="ri:delete-bin-5-line" class="size-4" />
            {{ t('Delete') }}
          </AppButton>
          <AppButton variant="outline" size="sm" @click="refresh">
            <Icon name="ri:refresh-line" class="size-4" />
            {{ t('Refresh') }}
          </AppButton>
        </div>
      </div>
    </AppCard>

    <AppCard padded class="space-y-3 text-sm">
      <KeyValue label="{{ t('Object Name') }}" :value="object?.Key" />
      <KeyValue label="{{ t('Object Size') }}" :value="object?.ContentLength" />
      <KeyValue label="{{ t('Object Type') }}" :value="object?.ContentType" />
      <KeyValue label="ETag" :value="object?.ETag" />
      <KeyValue label="{{ t('Last Modified Time') }}" :value="object?.LastModified" />
    </AppCard>

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
          <AppButton variant="outline" @click="showTagView = false">{{ t('Cancel') }}</AppButton>
        </form>
      </AppCard>
    </AppModal>

    <AppModal v-model="showPreview" :title="t('Preview')" size="xl">
      <AppCard padded>
        <object-preview-modal :show="true" :object="object" @update:show="showPreview = $event" />
      </AppCard>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { AppButton, AppCard, AppInput, AppModal, AppTag } from '@/components/app'
import { KeyValue } from '@/components/ui/key-value'
import { useI18n } from 'vue-i18n'
import ClipboardJS from 'clipboard'

const props = defineProps<{
  bucketName: string
  objectKey: string
}>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const object = ref<any>(null)
const tags = ref<Array<{ Key: string; Value: string }>>([])
const signedUrl = ref('')
const showTagView = ref(false)
const showPreview = ref(false)
const tagFormValue = ref({ Key: '', Value: '' })

const { getObjectInfo, getObjectTags, putObjectTags, deleteObject } = useObject({ bucket: props.bucketName })

const loadObjectInfo = async () => {
  try {
    object.value = await getObjectInfo(props.objectKey)
    signedUrl.value = object.value?.SignedUrl || ''
    const response = await getObjectTags(props.objectKey)
    tags.value = response.TagSet || []
  } catch (error) {
    message.error(t('Failed to fetch object info'))
  }
}

watch(
  () => props.objectKey,
  () => {
    loadObjectInfo()
  },
  { immediate: true }
)

const refresh = () => loadObjectInfo()

const copySignedUrl = () => {
  if (!signedUrl.value) return
  const clipboard = new ClipboardJS(document.createElement('button'), {
    text: () => signedUrl.value,
  })
  clipboard.on('success', () => message.success(t('Copy Success')))
  clipboard.on('error', () => message.error(t('Copy Failed')))
  clipboard.destroy()
}

const submitTagForm = async () => {
  if (!tagFormValue.value.Key || !tagFormValue.value.Value) {
    message.error(t('Please fill in the correct format'))
    return
  }
  try {
    const nextTags = [...tags.value, { ...tagFormValue.value }]
    await putObjectTags(props.objectKey, nextTags)
    tags.value = nextTags
    tagFormValue.value = { Key: '', Value: '' }
    message.success(t('Create Success'))
  } catch (error: any) {
    message.error(error?.message || t('Create Failed'))
  }
}

const confirmDelete = () => {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete this object?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: deleteObjectHandler,
  })
}

const deleteObjectHandler = async () => {
  try {
    await deleteObject(props.objectKey)
    message.success(t('Delete Success'))
  } catch (error: any) {
    message.error(error?.message || t('Delete Failed'))
  }
}

const download = () => {
  if (!signedUrl.value) return
  window.open(signedUrl.value, '_blank')
}

defineExpose({ refresh })
</script>
