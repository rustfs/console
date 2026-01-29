<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Buckets') }}</h1>
      <template #actions>
        <SearchInput v-model="searchTerm" :placeholder="t('Search')" clearable class="max-w-sm" />
        <Button variant="outline" @click="formVisible = true">
          <Icon name="ri:add-line" class="size-4" />
          <span>{{ t('Create Bucket') }}</span>
        </Button>
        <Button variant="outline" @click="() => refresh()">
          <Icon name="ri:refresh-line" class="size-4" />
          <span>{{ t('Refresh') }}</span>
        </Button>
      </template>
    </page-header>

    <DataTable
      :table="table"
      :is-loading="pending"
      :empty-title="t('No Buckets')"
      :empty-description="t('Create a bucket to start storing objects.')"
    />
  </page>

  <buckets-new-form :show="formVisible" @update:show="handleFormClosed" />
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button'

import { Icon, NuxtLink } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { niceBytes } from '@/utils/functions'
import type { ColumnDef } from '@tanstack/vue-table'
import dayjs from 'dayjs'
import { computed, h, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const { listBuckets, deleteBucket } = useBucket({})
const systemApi = useSystem()
const { isAdmin } = useAuth()

const formVisible = ref(false)
const searchTerm = ref('')

interface BucketRow {
  Name: string
  CreationDate: string
  Count?: number
  Size?: string
}

type BucketUsageMap = Record<string, { objects_count?: number; size?: number } | undefined>

const { data, pending, refresh } = await useAsyncData<BucketRow[]>(
  'buckets',
  async () => {
    const response = await listBuckets()

    // Only admin users can fetch data usage info
    let bucketUsage: BucketUsageMap = {}
    if (isAdmin.value) {
      const usage = await systemApi.getDataUsageInfo()
      bucketUsage = (usage?.buckets_usage ?? {}) as BucketUsageMap
    }

    const buckets = (response.Buckets ?? [])
      .map(item => {
        const name = item?.Name
        if (!name) {
          return null
        }

        const bucketRow: BucketRow = {
          Name: name,
          CreationDate: item?.CreationDate ? new Date(item.CreationDate).toISOString() : '',
        }

        // Only add Count and Size for admin users
        if (isAdmin.value) {
          const stats = bucketUsage[name]
          const objectsCount = typeof stats?.objects_count === 'number' ? stats.objects_count : 0
          const totalSize = typeof stats?.size === 'number' ? stats.size : 0
          bucketRow.Count = objectsCount
          bucketRow.Size = niceBytes(String(totalSize))
        }

        return bucketRow
      })
      .filter((bucket): bucket is BucketRow => bucket !== null)
      .sort((a, b) => a.Name.localeCompare(b.Name))

    return buckets
  },
  { default: () => [] as BucketRow[] }
)

const filteredData = computed(() => {
  const buckets = (data.value ?? []) as BucketRow[]
  if (!searchTerm.value) return buckets
  const term = searchTerm.value.toLowerCase()
  return buckets.filter(bucket => bucket.Name.toLowerCase().includes(term))
})

const columns = computed<ColumnDef<BucketRow>[]>(() => {
  const baseColumns: ColumnDef<BucketRow>[] = [
    {
      header: () => t('Bucket'),
      accessorKey: 'Name',
      cell: ({ row }) =>
        h(
          NuxtLink,
          {
            href: `/browser/${encodeURIComponent(row.original.Name)}`,
            class: 'flex items-center gap-2 text-primary hover:underline',
          },
          () => [h(Icon, { name: 'ri:archive-line', class: 'size-4' }), row.original.Name]
        ),
    },
    {
      header: () => t('Creation Date'),
      accessorKey: 'CreationDate',
      cell: ({ row }) => dayjs(row.original.CreationDate).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  // Only admin users can see Count and Size columns
  if (isAdmin.value) {
    baseColumns.push(
      {
        header: () => t('Object Count'),
        accessorKey: 'Count',
        cell: ({ row }) => row.original.Count?.toLocaleString() ?? '0',
      },
      {
        header: () => t('Size'),
        accessorKey: 'Size',
      }
    )
  }

  baseColumns.push({
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    meta: {
      width: 200,
    },
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h(
          Button,
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => router.push(`/buckets/${encodeURIComponent(row.original.Name)}`),
          },
          () => [h(Icon, { name: 'ri:settings-5-line', class: 'size-4' }), h('span', t('Settings'))]
        ),
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
  })

  return baseColumns
})

const { table } = useDataTable<BucketRow>({
  data: filteredData,
  columns,
  manualPagination: true,
  getRowId: row => row.Name,
})

const handleFormClosed = (value: boolean) => {
  formVisible.value = value
  if (!value) refresh()
}

const confirmDelete = (row: BucketRow) => {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete this bucket?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: () => deleteItem(row),
  })
}

const deleteItem = async (row: BucketRow) => {
  const objectApi = useObject({ bucket: row.Name })

  const files = await objectApi.listObject(row.Name, undefined, 1)
  const hasObjects =
    Boolean(files?.Contents?.some(item => Boolean(item?.Key))) || Boolean(files?.CommonPrefixes?.length)

  if (hasObjects) {
    message.error(t('Bucket is not empty'))
    return
  }

  try {
    await deleteBucket(row.Name)
    message.success(t('Delete Success'))
    await refresh()
  } catch (error: any) {
    message.error(error?.response?.data?.message || t('Delete Failed'))
  }
}
</script>
