<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Event Destinations') }}</h1>
      <template #actions>
        <div class="w-full sm:max-w-xs">
          <SearchInput v-model="searchTerm" :placeholder="t('Search')" clearable class="w-full" />
        </div>
        <Button variant="outline" @click="addForm">
          <Icon name="ri:add-line" class="size-4" />
          <span>{{ t('Add Event Destination') }}</span>
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
      :empty-title="t('No Destinations')"
      :empty-description="t('Create an event destination to forward notifications.')"
    />

    <events-target-new-form ref="newFormRef" @search="() => refresh()" />
  </page>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@tanstack/vue-table'
import { h, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const { getEventsTargetList, deleteEventTarget } = useEventTarget()

interface RowData {
  account_id: string
  service: string
  status: string
}

const searchTerm = ref('')

const columns: ColumnDef<RowData>[] = [
  {
    accessorKey: 'account_id',
    header: () => t('Event Destinations'),
    cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, row.original.account_id),
    filterFn: 'includesString',
  },
  {
    accessorKey: 'service',
    header: () => t('Type'),
    cell: ({ row }) => h('span', row.original.service),
  },
  {
    accessorKey: 'status',
    header: () => t('Status'),
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: row.original.status === 'enable' ? 'secondary' : 'outline',
        },
        () => (row.original.status === 'enable' ? t('Enabled') : row.original.status || '-')
      ),
  },
  {
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    enableHiding: false,
    meta: {
      width: 90,
    },
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

const endpoints = ref<RowData[]>([])
const { table } = useDataTable<RowData>({
  data: endpoints,
  columns,
  getRowId: row => `${row.service}-${row.account_id}`,
})

watch(searchTerm, value => {
  table.getColumn('account_id')?.setFilterValue(value || undefined)
})

const { data, pending, refresh } = await useAsyncData(
  'events-targets',
  async () => {
    const response = await getEventsTargetList()
    return (response.notification_endpoints ?? []) as RowData[]
  },
  {
    default: () => [],
    server: false,
  }
)

watch(
  () => data.value,
  value => {
    endpoints.value = value ?? []
  },
  { immediate: true }
)

const confirmDelete = (row: RowData) => {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete this destination?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: () => deleteItem(row),
  })
}

const deleteItem = async (row: RowData) => {
  try {
    await deleteEventTarget(`notify_${row.service}`, row.account_id)
    message.success(t('Delete Success'))
    refresh()
  } catch (error) {
    console.error(error)
    message.error(t('Delete Failed'))
  }
}

const newFormRef = ref<{ open: () => void }>()
const addForm = () => {
  newFormRef.value?.open()
}
</script>
