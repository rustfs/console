<template>
  <div class="flex flex-col gap-6">
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Event Destinations') }}</h1>
      </template>
    </page-header>

    <page-content class="flex flex-col gap-4">
      <AppCard
        :padded="false"
        :content-class="'flex flex-col gap-4 md:flex-row md:items-center md:justify-between'"
      >
        <div class="flex w-full max-w-sm items-center gap-2">
          <Icon name="ri:search-2-line" class="size-4 text-muted-foreground" />
          <Input v-model="searchTerm" :placeholder="t('Search')" />
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" @click="addForm">
            <Icon name="ri:add-line" class="size-4" />
            <span>{{ t('Add Event Destination') }}</span>
          </Button>
          <Button variant="outline" @click="() => refresh()">
            <Icon name="ri:refresh-line" class="size-4" />
            <span>{{ t('Refresh') }}</span>
          </Button>
        </div>
      </AppCard>

      <AppCard>
        <AppDataTable
          :table="table"
          :is-loading="pending"
          :empty-title="t('No Destinations')"
          :empty-description="t('Create an event destination to forward notifications.')"
        />
      </AppCard>
    </page-content>

    <events-target-new ref="newFormRef" @search="() => refresh()" />
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import type { ColumnDef } from '@tanstack/vue-table'
import { AppCard, AppTag } from '@/components/app'
import AppDataTable from '@/components/app/data-table/AppDataTable.vue'
import { useDataTable } from '@/components/app/data-table'
import { h, computed, ref, watch } from 'vue'
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
        AppTag,
        {
          tone: row.original.status === 'enable' ? 'success' : 'warning',
        },
        () => (row.original.status === 'enable' ? t('Enabled') : row.original.status || '-')
      ),
  },
  {
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) =>
      h('div', { class: 'flex justify-center gap-2' }, [
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