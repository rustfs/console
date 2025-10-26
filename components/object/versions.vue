<template>
  <AppModal v-model="visibleProxy" :title="t('Object Versions')" size="lg" :close-on-backdrop="false">
    <AppCard padded>
      <AppDataTable :table="table" :is-loading="loading" :empty-title="t('No Versions')" />
      <div class="mt-4 flex justify-end">
        <AppButton variant="outline" @click="closeModal">{{ t('Close') }}</AppButton>
      </div>
    </AppCard>
  </AppModal>
</template>

<script setup lang="tsx">
import { AppButton, AppCard, AppDataTable, AppModal } from '@/components/app'
import { useDataTable } from '@/components/app/data-table'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  bucketName: string
  objectKey: string
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'preview', versionId: string): void
  (e: 'refresh-parent'): void
}>()

const { t } = useI18n()
const message = useMessage()

const visibleProxy = computed({
  get: () => props.visible,
  set: value => {
    if (!value) emit('close')
  },
})

const versions = ref<any[]>([])
const loading = ref(false)

const columns = computed(() => [
  {
    header: () => t('VersionId'),
    cell: ({ row }: any) => shortVersionId(row.original.VersionId),
  },
  {
    header: () => t('LastModified'),
    cell: ({ row }: any) => (row.original.LastModified ? dayjs(row.original.LastModified).format('YYYY-MM-DD HH:mm:ss') : ''),
  },
  {
    header: () => t('Size'),
    cell: ({ row }: any) => (typeof row.original.Size === 'number' ? formatBytes(row.original.Size) : ''),
  },
  {
    id: 'actions',
    header: () => t('Action'),
    cell: ({ row }: any) => (
      <div class="flex gap-2">
        <AppButton variant="outline" size="sm" onClick={() => previewVersion(row.original)}>
          {t('Preview')}
        </AppButton>
        <AppButton variant="outline" size="sm" onClick={() => downloadVersion(row.original)}>
          {t('Download')}
        </AppButton>
        <AppButton variant="destructive" size="sm" onClick={() => deleteVersion(row.original)}>
          {t('Delete')}
        </AppButton>
      </div>
    ),
  },
])

const { table } = useDataTable({
  data: versions,
  columns,
})

watch(
  () => props.visible,
  value => {
    if (value) fetchVersions()
  }
)

const fetchVersions = async () => {
  loading.value = true
  const { getObjectVersions } = useObject({ bucket: props.bucketName })
  try {
    const response = await getObjectVersions(props.objectKey)
    versions.value = response.Versions ?? []
  } catch (error) {
    message.error(t('Failed to fetch versions'))
    versions.value = []
  } finally {
    loading.value = false
  }
}

const shortVersionId = (versionId: string) => {
  if (!versionId) return ''
  const parts = versionId.split(/[-./]/)
  return parts[parts.length - 1]
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

const previewVersion = (row: any) => emit('preview', row.VersionId)

const downloadVersion = async (row: any) => {
  const url = await getSignedUrlWithVersion(props.objectKey, row.VersionId)
  window.open(url, '_blank')
}

const deleteVersion = async (row: any) => {
  const { deleteObject } = useObject({ bucket: props.bucketName })
  try {
    await deleteObject(props.objectKey, row.VersionId)
    message.success(t('Delete Success'))
    fetchVersions()
    emit('refresh-parent')
  } catch (error: any) {
    message.error(error?.message || t('Delete Failed'))
  }
}

const getSignedUrlWithVersion = async (key: string, versionId: string, expiresIn = 3600) => {
  const client = useNuxtApp().$s3Client
  const command = new GetObjectCommand({
    Bucket: props.bucketName,
    Key: key,
    VersionId: versionId,
  })
  return await getSignedUrl(client, command, { expiresIn })
}

const closeModal = () => emit('close')
</script>
