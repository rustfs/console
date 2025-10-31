<template>
  <Modal v-model="visibleProxy" :title="t('Object Versions')" size="lg" :close-on-backdrop="false">
    <div class="space-y-4 z-20">
      <DataTable :table="table" :is-loading="loading" :empty-title="t('No Versions')" />
      <div class="flex justify-end">
        <Button variant="outline" @click="closeModal">{{ t('Close') }}</Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { ColumnDef } from '@tanstack/vue-table'
import dayjs from 'dayjs'
import { computed, h, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '~/components/modal.vue'

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
const ActionButton = Button as unknown as any

const visibleProxy = computed({
  get: () => props.visible,
  set: value => {
    if (!value) emit('close')
  },
})

const versions = ref<any[]>([])
const loading = ref(false)

const objectApi = useObject({ bucket: props.bucketName })

const columns = computed<ColumnDef<any, any>[]>(() => [
  {
    id: 'versionId',
    header: () => t('VersionId'),
    cell: ({ row }: any) => shortVersionId(row.original.VersionId),
  },
  {
    id: 'lastModified',
    header: () => t('LastModified'),
    cell: ({ row }: any) =>
      row.original.LastModified ? dayjs(row.original.LastModified).format('YYYY-MM-DD HH:mm:ss') : '',
  },
  {
    id: 'size',
    header: () => t('Size'),
    cell: ({ row }: any) => (typeof row.original.Size === 'number' ? formatBytes(row.original.Size) : ''),
  },
  {
    id: 'actions',
    header: () => t('Action'),
    cell: ({ row }: any) =>
      h('div', { class: 'flex gap-2' }, [
        h(
          ActionButton,
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => previewVersion(row.original),
          },
          () => t('Preview')
        ),
        h(
          ActionButton,
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => downloadVersion(row.original),
          },
          () => t('Download')
        ),
        h(
          ActionButton,
          {
            variant: 'destructive',
            size: 'sm',
            onClick: () => deleteVersion(row.original),
          },
          () => t('Delete')
        ),
      ]),
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
  try {
    const response = await objectApi.getObjectVersions(props.objectKey)
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
  try {
    await objectApi.deleteObject(props.objectKey, row.VersionId)
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
