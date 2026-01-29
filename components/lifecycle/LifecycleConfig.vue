<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-medium">{{ t('Lifecycle') }}</h2>
      <div class="flex gap-2">
        <Button variant="outline" @click="handleNew">
          <Icon name="ri:add-line" class="size-4" />
          <span>{{ t('Add Lifecycle Rule') }}</span>
        </Button>
        <Button variant="outline" @click="() => refresh()">
          <Icon name="ri:refresh-line" class="size-4" />
          <span>{{ t('Refresh') }}</span>
        </Button>
      </div>
    </div>

    <DataTable
      :table="table"
      :is-loading="loading"
      :empty-title="t('No Data')"
      :empty-description="t('Create lifecycle rules to automate object transitions and expiration.')"
    />

    <lifecycle-new-form ref="newRef" :bucketName="bucketName" @search="() => refresh()" />
  </div>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@tanstack/vue-table'
import { h, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBucket } from '@/composables/useBucket'

const props = defineProps<{
  bucketName: string
}>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const { getBucketLifecycleConfiguration, deleteBucketLifecycle, putBucketLifecycleConfiguration } = useBucket({})

interface LifecycleRule {
  ID?: string
  Status?: string
  Filter?: {
    Prefix?: string
    Tag?: { Key: string; Value: string }
    And?: {
      Prefix?: string
      Tags?: Array<{ Key: string; Value: string }>
    }
  }
  Expiration?: {
    Days?: number
    Date?: string
    StorageClass?: string
    ExpiredObjectDeleteMarker?: boolean
  }
  NoncurrentVersionExpiration?: {
    NoncurrentDays?: number
  }
  Transitions?: Array<{ Days?: number; StorageClass?: string }>
  NoncurrentVersionTransitions?: Array<{ NoncurrentDays?: number; StorageClass?: string }>
}

const columns: ColumnDef<LifecycleRule>[] = [
  {
    id: 'type',
    header: () => t('Type'),
    accessorFn: row => (row.Transitions || row.NoncurrentVersionTransitions ? 'Transition' : 'Expire'),
  },
  {
    id: 'version',
    header: () => t('Version'),
    accessorFn: row =>
      row.NoncurrentVersionExpiration || row.NoncurrentVersionTransitions
        ? t('Non-current Version')
        : t('Current Version'),
  },
  {
    id: 'deleteMarker',
    header: () => t('Expiration Delete Mark'),
    accessorFn: row => (row.Expiration?.ExpiredObjectDeleteMarker ? t('On') : t('Off')),
  },
  {
    id: 'tier',
    header: () => t('Tier'),
    accessorFn: row =>
      row.Transitions?.[0]?.StorageClass || row.NoncurrentVersionTransitions?.[0]?.StorageClass || '--',
  },
  {
    id: 'prefix',
    header: () => t('Prefix'),
    accessorFn: row => row.Filter?.Prefix || row.Filter?.And?.Prefix || '',
  },
  {
    id: 'timeCycle',
    header: () => `${t('Time Cycle')} (${t('Days')})`,
    accessorFn: row =>
      row.Expiration?.Days ||
      row.NoncurrentVersionExpiration?.NoncurrentDays ||
      row.Transitions?.[0]?.Days ||
      row.NoncurrentVersionTransitions?.[0]?.NoncurrentDays ||
      '',
  },
  {
    id: 'status',
    header: () => t('Status'),
    accessorFn: row => row.Status || '-',
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: row.original.Status === 'Enabled' ? 'secondary' : 'destructive',
        },
        () => row.original.Status || '-'
      ),
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
          () => [h(Icon, { name: 'ri:delete-bin-5-line', class: 'size-4' }), h('span', t('Delete'))]
        ),
      ]),
  },
]

const pageData = ref<LifecycleRule[]>([])
const loading = ref(false)

const { table } = useDataTable<LifecycleRule>({
  data: pageData,
  columns,
  getRowId: row => row.ID ?? JSON.stringify(row),
})

const fetchLifecycle = async () => {
  if (!props.bucketName) {
    pageData.value = []
    return
  }

  loading.value = true
  try {
    const response = await getBucketLifecycleConfiguration(props.bucketName)
    const sortedRules: LifecycleRule[] = [...(response.Rules ?? [])]
      .map(rule => rule as LifecycleRule)
      .sort((a, b) => (a.ID ?? '').localeCompare(b.ID ?? ''))
    pageData.value = sortedRules
  } catch (error) {
    pageData.value = []
  } finally {
    loading.value = false
  }
}

const refresh = async () => {
  await fetchLifecycle()
}

watch(
  () => props.bucketName,
  () => {
    refresh()
  },
  { immediate: true }
)

const confirmDelete = (row: LifecycleRule) => {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete this rule?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: () => handleRowDelete(row),
  })
}

const handleRowDelete = async (row: LifecycleRule) => {
  const remaining = pageData.value.filter(item => item.ID !== row.ID)

  if (!props.bucketName) {
    return
  }

  try {
    if (remaining.length === 0) {
      await deleteBucketLifecycle(props.bucketName)
    } else {
      await putBucketLifecycleConfiguration(props.bucketName, { Rules: remaining })
    }
    message.success(t('Delete Success'))
    await refresh()
  } catch (error: any) {
    message.error(error?.message || t('Delete Failed'))
  }
}

const newRef = ref<{ open: () => void }>()
const handleNew = () => {
  newRef.value?.open()
}
</script>
