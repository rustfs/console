<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Bucket Replication') }}</h1>
      <template #actions>
        <ActionBar class="w-full justify-end gap-3 sm:w-auto">
          <BucketSelector
            v-model="bucketName"
            :placeholder="t('Please select bucket')"
            selector-class="sm:w-56"
            cache-key="replication-buckets"
          />
          <Button variant="outline" @click="openForm">
            <Icon name="ri:add-line" class="size-4" />
            <span>{{ t('Add Replication Rule') }}</span>
          </Button>
          <Button variant="outline" @click="() => loadReplication()">
            <Icon name="ri:refresh-line" class="size-4" />
            <span>{{ t('Refresh') }}</span>
          </Button>
        </ActionBar>
      </template>
    </page-header>

    <DataTable
      :table="table"
      :is-loading="loading"
      :empty-title="t('No Data')"
      :empty-description="t('Add replication rules to sync objects across buckets.')"
    />

    <replication-new-form ref="addFormRef" :bucketName="bucketName" @success="() => loadReplication()" />
  </page>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { Badge } from '@/components/ui/badge'
import { useBucket } from '@/composables/useBucket'
import type { ColumnDef } from '@tanstack/vue-table'
import { h, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const { getBucketReplication, putBucketReplication, deleteBucketReplication, deleteRemoteReplicationTarget } =
  useBucket({})

interface ReplicationRule {
  ID?: string
  Status?: string
  Priority?: number
  Filter?: {
    Prefix?: string
  }
  Destination?: {
    Bucket?: string
    StorageClass?: string
  }
}

const bucketName = ref<string | null>(null)
const rules = ref<ReplicationRule[]>([])
const loading = ref(false)

const columns: ColumnDef<ReplicationRule>[] = [
  {
    accessorKey: 'ID',
    header: () => t('Rule ID'),
    cell: ({ row }) => h('span', row.original.ID || '-'),
  },
  {
    accessorKey: 'Status',
    header: () => t('Status'),
    cell: ({ row }) =>
      h(Badge, { variant: row.original.Status === 'Enabled' ? 'secondary' : 'outline' }, () =>
        row.original.Status === 'Enabled' ? t('Enabled') : t('Disabled')
      ),
  },
  {
    accessorKey: 'Priority',
    header: () => t('Priority'),
    cell: ({ row }) => h('span', String(row.original.Priority ?? '-')),
  },
  {
    id: 'Filter',
    header: () => t('Prefix'),
    cell: ({ row }) => h('span', row.original.Filter?.Prefix || '-'),
  },
  {
    id: 'destination-bucket',
    header: () => t('Destination Bucket'),
    cell: ({ row }) => {
      const bucketArn = row.original.Destination?.Bucket || ''
      return h('span', bucketArn.replace(/^arn:aws:s3:::/, '') || '-')
    },
  },
  {
    id: 'destination-storage',
    header: () => t('Storage Class'),
    cell: ({ row }) => h('span', row.original.Destination?.StorageClass || '-'),
  },
  {
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h(
          Button,
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => confirmDelete(row.original),
          },
          () => [h(Icon, { name: 'ri:delete-bin-7-line', class: 'size-4' }), h('span', t('Delete'))]
        ),
      ]),
  },
]

const { table } = useDataTable<ReplicationRule>({
  data: rules,
  columns,
  getRowId: row => row.ID ?? JSON.stringify(row),
})

const loadReplication = async () => {
  if (!bucketName.value) {
    rules.value = []
    return
  }
  loading.value = true
  try {
    const res = await getBucketReplication(bucketName.value as string)
    rules.value = res?.ReplicationConfiguration?.Rules ?? []
  } catch (error) {
    rules.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => bucketName.value,
  () => {
    loadReplication()
  },
  { immediate: true }
)

const confirmDelete = (rule: ReplicationRule) => {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete this replication rule?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: () => handleRowDelete(rule),
  })
}

const handleRowDelete = async (rule: ReplicationRule) => {
  const remaining = rules.value.filter(item => item !== rule)

  if (!bucketName.value) {
    return
  }

  try {
    if (remaining.length === 0) {
      await deleteBucketReplication(bucketName.value as string)
      await deleteRemoteReplicationTarget(bucketName.value as string, rule.Destination?.Bucket ?? '')
    } else {
      // 获取当前配置以获取 Role 字段
      const currentConfig = await getBucketReplication(bucketName.value as string)
      const role = currentConfig?.ReplicationConfiguration?.Role

      if (!role) {
        throw new Error('Replication configuration Role is missing')
      }

      await putBucketReplication(bucketName.value as string, {
        Role: role,
        Rules: remaining,
      })
    }
    message.success(t('Delete Success'))
    await loadReplication()
  } catch (error: any) {
    message.error(error?.message || t('Delete Failed'))
  }
}

const addFormRef = ref<{ open: () => void }>()
const openForm = () => {
  addFormRef.value?.open()
}
</script>
