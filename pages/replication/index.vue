<template>
  <div class="flex flex-col gap-6">
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Bucket Replication') }}</h1>
      </template>
    </page-header>

    <page-content class="flex flex-col gap-4">
      <div
        class="flex flex-col gap-4 rounded-lg border border-border/60 bg-background/80 p-4 shadow-sm md:flex-row md:items-end md:justify-between"
      >
        <div class="w-full max-w-sm">
          <Label class="mb-2 block text-sm font-medium text-muted-foreground">{{ t('Bucket') }}</Label>
          <AppSelect
            v-model="bucketName"
            :options="bucketList"
            :placeholder="t('Please select bucket')"
            class="w-full"
          />
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <AppButton variant="secondary" @click="openForm">
            <Icon name="ri:add-line" class="size-4" />
            <span>{{ t('Add Replication Rule') }}</span>
          </AppButton>
          <AppButton variant="outline" @click="loadReplication">
            <Icon name="ri:refresh-line" class="size-4" />
            <span>{{ t('Refresh') }}</span>
          </AppButton>
        </div>
      </div>

      <AppCard padded class="border border-border/60">
        <AppDataTable
          :table="table"
          :is-loading="loading"
          :empty-title="t('No Data')"
          :empty-description="t('Add replication rules to sync objects across buckets.')"
        />
      </AppCard>

      <replication-new-form ref="addFormRef" :bucketName="bucketName" @success="loadReplication" />
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import type { ColumnDef } from '@tanstack/vue-table'
import { AppButton, AppCard, AppSelect, AppTag } from '@/components/app'
import { AppDataTable, useDataTable } from '@/components/app/data-table'
import { Label } from '@/components/ui/label'
import { computed, h, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBucket } from '@/composables/useBucket'

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

const { data: bucketData } = await useAsyncData(
  'replication-buckets',
  async () => {
    const response = await listBuckets()
    return (
      response.Buckets?.sort((a: any, b: any) => a.Name.localeCompare(b.Name)) ?? []
    )
  },
  { default: () => [] }
)

const bucketList = computed(() =>
  bucketData.value.map(bucket => ({
    label: bucket.Name,
    value: bucket.Name,
  }))
)

const bucketName = ref<string>(bucketList.value[0]?.value ?? '')
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
          AppButton,
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
    loadReplication()
  } catch (error: any) {
    message.error(error?.message || t('Delete Failed'))
  }
}

const addFormRef = ref<{ open: () => void }>()
const openForm = () => {
  addFormRef.value?.open()
}
</script>
