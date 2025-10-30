<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Lifecycle') }}</h1>
      <template #actions>
        <ActionBar class="w-full justify-end gap-3 sm:w-auto">
          <BucketSelector v-model="bucketName" :options="bucketList" :placeholder="t('Please select bucket')" class="w-full sm:w-auto" selector-class="sm:w-56" />
          <Button variant="outline" @click="handleNew">
            <Icon name="ri:add-line" class="size-4" />
            <span>{{ t('Add Lifecycle Rule') }}</span>
          </Button>
          <Button variant="outline" @click="() => refresh()">
            <Icon name="ri:refresh-line" class="size-4" />
            <span>{{ t('Refresh') }}</span>
          </Button>
        </ActionBar>
      </template>
    </page-header>

    <DataTable :table="table" :is-loading="loading" :empty-title="t('No Data')" :empty-description="t('Create lifecycle rules to automate object transitions and expiration.')" />

    <lifecycle-new-form ref="newRef" :bucketName="bucketName" @search="() => refresh()" />
  </page>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { Badge } from '@/components/ui/badge'
import type { Bucket } from '@aws-sdk/client-s3'
import type { ColumnDef } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SelectOption } from '~/components/selector.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const { listBuckets, getBucketLifecycleConfiguration, deleteBucketLifecycle, putBucketLifecycleConfiguration } =
  useBucket({})

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
      row.NoncurrentVersionExpiration || row.NoncurrentVersionTransitions ? t('Non-current Version') : t('Current Version'),
  },
  {
    id: 'deleteMarker',
    header: () => t('Expiration Delete Mark'),
    accessorFn: row => (row.Expiration?.ExpiredObjectDeleteMarker ? t('On') : t('Off')),
  },
  {
    id: 'tier',
    header: () => t('Tier'),
    accessorFn: row => row.Transitions?.[0]?.StorageClass || row.NoncurrentVersionTransitions?.[0]?.StorageClass || '--',
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
        () => row.original.Status || '-',
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
          () => [h(Icon, { name: 'ri:delete-bin-5-line', class: 'size-4' }), h('span', t('Delete'))],
        ),
      ]),
  },
]

const bucketOptions = await useAsyncData<Bucket[]>(
  'lifecycle-buckets',
  async () => {
    const response = await listBuckets()
    const buckets = (response.Buckets ?? []).filter((bucket): bucket is Bucket => Boolean(bucket?.Name))
    return buckets.sort((a, b) => (a.Name ?? '').localeCompare(b.Name ?? ''))
  },
  { default: () => [] as Bucket[] },
)

const bucketList = computed<SelectOption[]>(() => {
  const buckets = bucketOptions.data.value ?? []
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
const pageData = ref<LifecycleRule[]>([])
const loading = ref(false)

const { table } = useDataTable<LifecycleRule>({
  data: pageData,
  columns,
  getRowId: row => row.ID ?? JSON.stringify(row),
})

const fetchLifecycle = async () => {
  if (!bucketName.value) {
    pageData.value = []
    return
  }

  loading.value = true
  try {
    const response = await getBucketLifecycleConfiguration(bucketName.value)
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
  () => bucketName.value,
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

  try {
    if (remaining.length === 0) {
      await deleteBucketLifecycle(bucketName.value)
    } else {
      await putBucketLifecycleConfiguration(bucketName.value, { Rules: remaining })
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
