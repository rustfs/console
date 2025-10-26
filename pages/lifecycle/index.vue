<template>
  <div class="flex flex-col gap-6">
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Lifecycle') }}</h1>
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
          <AppButton variant="secondary" @click="handleNew">
            <Icon name="ri:add-line" class="size-4" />
            <span>{{ t('Add Lifecycle Rule') }}</span>
          </AppButton>
          <AppButton variant="outline" @click="refresh">
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
          :empty-description="t('Create lifecycle rules to automate object transitions and expiration.')"
        />
      </AppCard>

      <lifecycle-new-form ref="newRef" :bucketName="bucketName" @search="refresh" />
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import type { ColumnDef } from '@tanstack/vue-table'
import { AppButton, AppCard, AppSelect, AppTag } from '@/components/app'
import { AppDataTable, useDataTable } from '@/components/app/data-table'
import { Label } from '@/components/ui/label'
import { h, computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

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
    header: () => t('Type'),
    accessorFn: row => (row.Transitions || row.NoncurrentVersionTransitions ? 'Transition' : 'Expire'),
  },
  {
    header: () => t('Version'),
    accessorFn: row => (row.NoncurrentVersionExpiration || row.NoncurrentVersionTransitions ? t('Non-current Version') : t('Current Version')),
  },
  {
    header: () => t('Expiration Delete Mark'),
    accessorFn: row => (row.Expiration?.ExpiredObjectDeleteMarker ? t('On') : t('Off')),
  },
  {
    header: () => t('Tier'),
    accessorFn: row => row.Transitions?.[0]?.StorageClass || row.NoncurrentVersionTransitions?.[0]?.StorageClass || '--',
  },
  {
    header: () => t('Prefix'),
    accessorFn: row => row.Filter?.Prefix || row.Filter?.And?.Prefix || '',
  },
  {
    header: () => `${t('Time Cycle')} (${t('Days')})`,
    accessorFn: row =>
      row.Expiration?.Days ||
      row.NoncurrentVersionExpiration?.NoncurrentDays ||
      row.Transitions?.[0]?.Days ||
      row.NoncurrentVersionTransitions?.[0]?.NoncurrentDays ||
      '',
  },
  {
    header: () => t('Status'),
    accessorFn: row => row.Status || '-',
    cell: ({ row }) =>
      h(
        AppTag,
        {
          tone: row.original.Status === 'Enabled' ? 'success' : 'danger',
        },
        () => row.original.Status || '-'
      ),
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
          () => [h(Icon, { name: 'ri:delete-bin-5-line', class: 'size-4' }), h('span', t('Delete'))]
        ),
      ]),
  },
]

const bucketOptions = await useAsyncData(
  'lifecycle-buckets',
  async () => {
    const response = await listBuckets()
    return (
      response.Buckets?.sort((a: any, b: any) => {
        return a.Name.localeCompare(b.Name)
      }) || []
    )
  },
  { default: () => [] }
)

const bucketList = computed(() =>
  bucketOptions.data.value.map(bucket => ({
    label: bucket.Name,
    value: bucket.Name,
  }))
)

const bucketName = ref<string>(bucketList.value.length > 0 ? bucketList.value[0]?.value ?? '' : '')
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
    pageData.value = response.Rules?.sort((a: any, b: any) => (a.ID || '').localeCompare(b.ID || '')) ?? []
  } catch (error) {
    pageData.value = []
  } finally {
    loading.value = false
  }
}

const refresh = () => fetchLifecycle()

watch(
  () => bucketName.value,
  () => {
    fetchLifecycle()
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
    fetchLifecycle()
  } catch (error: any) {
    message.error(error?.message || t('Delete Failed'))
  }
}

const newRef = ref<{ open: () => void }>()
const handleNew = () => {
  newRef.value?.open()
}
</script>
