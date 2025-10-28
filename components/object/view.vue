<template>
  <div class="space-y-4">
    <AppCard padded class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="sm" @click="router.back">
              <Icon name="ri:arrow-left-line" class="size-4" />
            </Button>
            <h2 class="text-lg font-semibold">{{ object?.Key }}</h2>
          </div>
          <p class="text-sm text-muted-foreground">{{ t('Object Detail Description', { bucket: bucketName }) }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" @click="download">
            <Icon name="ri:download-line" class="size-4" />
            {{ t('Download') }}
          </Button>
          <Button variant="outline" size="sm" @click="copySignedUrl">
            <Icon name="ri:file-copy-line" class="size-4" />
            {{ t('Copy Temporary URL') }}
          </Button>
          <Button variant="outline" size="sm" @click="() => (showPreview = true)">
            <Icon name="ri:eye-line" class="size-4" />
            {{ t('Preview') }}
          </Button>
          <Button variant="outline" size="sm" @click="() => (showTagView = true)">
            <Icon name="ri:price-tag-3-line" class="size-4" />
            {{ t('Set Tags') }}
          </Button>
          <Button variant="destructive" size="sm" @click="confirmDelete">
            <Icon name="ri:delete-bin-5-line" class="size-4" />
            {{ t('Delete') }}
          </Button>
          <Button variant="outline" size="sm" @click="refresh">
            <Icon name="ri:refresh-line" class="size-4" />
            {{ t('Refresh') }}
          </Button>
        </div>
      </div>
    </AppCard>

    <AppCard padded class="space-y-3 text-sm">
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
    </AppCard>

    <AppModal v-model="showTagView" :title="t('Set Tags')" size="lg">
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <AppTag v-for="tag in tags" :key="tag.Key" tone="info">
            {{ tag.Key }}: {{ tag.Value }}
          </AppTag>
        </div>
        <form class="flex flex-wrap gap-3" @submit.prevent="submitTagForm">
          <Input v-model="tagFormValue.Key" :placeholder="t('Tag Key Placeholder')" />
          <Input v-model="tagFormValue.Value" :placeholder="t('Tag Value Placeholder')" />
          <Button type="submit" variant="default">{{ t('Add') }}</Button>
          <Button variant="outline" @click="showTagView = false">{{ t('Cancel') }}</Button>
        </form>
      </div>
    </AppModal>

    <object-preview-modal :show="showPreview" :object="object" @update:show="showPreview = $event" />
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import { AppCard, AppModal, AppTag } from '@/components/app'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const props = defineProps<{
  bucketName: string
  objectKey: string
}>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const router = useRouter()

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
    tags.value = response
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

const copySignedUrl = async () => {
  if (!signedUrl.value) return
  try {
    await navigator.clipboard.writeText(signedUrl.value)
    message.success(t('Copy Success'))
  } catch (error) {
    message.error(t('Copy Failed'))
  }
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
