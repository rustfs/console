<template>
  <page>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Bucket Replication') }}</h1>
      </template>
      <div class="flex-1 flex flex-wrap items-center justify-end gap-2">
        <Label class="text-sm font-medium text-muted-foreground">{{ t('Bucket') }}</Label>
        <AppSelect v-model="bucketName" :options="bucketList" :placeholder="t('Please select bucket')" class="max-w-xs" />
        <Button variant="secondary" @click="openForm">
          <Icon name="ri:add-line" class="size-4" />
          <span>{{ t('Add Replication Rule') }}</span>
        </Button>
        <Button variant="outline" @click="() => loadReplication()">
          <Icon name="ri:refresh-line" class="size-4" />
          <span>{{ t('Refresh') }}</span>
        </Button>
      </div>
    </page-header>

    <DataTable :table="table" :is-loading="loading" :empty-title="t('No Data')" :empty-description="t('Add replication rules to sync objects across buckets.')" />

    <replication-new-form ref="addFormRef" :bucketName="bucketName" @success="() => loadReplication()" />
  </page>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import { AppSelect, AppTag } from '@/components/app'
import type { SelectOption } from '@/components/app/AppSelect.vue'
import { Label } from '@/components/ui/label'
import { useBucket } from '@/composables/useBucket'
import type { Bucket } from '@aws-sdk/client-s3'
import type { ColumnDef } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDataTable } from '~/components/data-table'
import DataTable from '~/components/data-table/data-table.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const {
  listBuckets,
  getBucketReplication,
  putBucketReplication,
  deleteBucketReplication,
  deleteRemoteReplicationTarget,
} = useBucket({})

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

const { data: bucketData } = await useAsyncData<Bucket[]>(
  'replication-buckets',
  async () => {
    const response = await listBuckets()
    const buckets = (response.Buckets ?? []).filter((bucket): bucket is Bucket => Boolean(bucket?.Name))
    return buckets.sort((a, b) => (a.Name ?? '').localeCompare(b.Name ?? ''))
  },
  { default: () => [] as Bucket[] }
)

const bucketList = computed<SelectOption[]>(() => {
  const buckets = bucketData.value ?? []
  return buckets.reduce<SelectOption[]>((acc, bucket) => {
    const name = bucket.Name ?? ''
    if (!name) {
      return acc
    }
    acc.push({ label: name, value: name })
    return acc
  }, [])
})

const initialBucketOption = bucketList.value[0]?.value
const initialBucket = typeof initialBucketOption === 'string' ? initialBucketOption : ''
const bucketName = ref<string>(initialBucket)
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
      h(
        AppTag,
        { tone: row.original.Status === 'Enabled' ? 'success' : 'warning' },
        () => (row.original.Status === 'Enabled' ? t('Enabled') : t('Disabled'))
      ),
  },
  {
    accessorKey: 'Priority',
    header: () => t('Priority'),
    cell: ({ row }) => h('span', String(row.original.Priority ?? '-')),
  },
  {
    accessorKey: 'Filter',
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
      h('div', { class: 'flex justify-center gap-2' }, [
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
    const res = await getBucketReplication(bucketName.value)
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

  try {
    if (remaining.length === 0) {
      await deleteBucketReplication(bucketName.value)
      await deleteRemoteReplicationTarget(bucketName.value, rule.Destination?.Bucket ?? '')
    } else {
      await putBucketReplication(bucketName.value, {
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
