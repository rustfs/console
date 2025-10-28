<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Access Keys') }}</h1>
      <template #actions>
        <SearchInput v-model="searchTerm" :placeholder="t('Search Access Key')" clearable class="max-w-sm" />
        <Button variant="outline" @click="changePasswordVisible = true">
          <Icon name="ri:key-2-line" class="size-4" />
          <span>{{ t('Change Password') }}</span>
        </Button>
        <Button variant="outline" v-show="selectedKeys.length" :disabled="!selectedKeys.length" @click="deleteSelected">
          <Icon name="ri:delete-bin-5-line" class="size-4" />
          <span>{{ t('Delete Selected') }}</span>
        </Button>
        <Button variant="secondary" @click="addItem">
          <Icon name="ri:add-line" class="size-4" />
          <span>{{ t('Add Access Key') }}</span>
        </Button>
      </template>
    </page-header>

    <div class="space-y-3">
      <DataTable :table="table" :is-loading="loading" :empty-title="t('No Access Keys')" :empty-description="t('Create a new access key to get started.')" class="overflow-hidden"
        table-class="min-w-full" />
      <DataTablePagination :table="table" class="px-2 py-3" />
    </div>

    <NewItem ref="newItemRef" v-model:visible="newItemVisible" @search="refresh" @notice="noticeDialog" />
    <EditItem ref="editItemRef" @search="refresh" />
    <ChangePassword ref="changePasswordModalRef" v-model:visible="changePasswordVisible" />
    <users-user-notice ref="noticeRef" @search="refresh" />
  </page>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import { ChangePassword, EditItem, NewItem } from '@/components/access-keys'
import DataTablePagination from '@/components/data-table/data-table-pagination.vue'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { ColumnDef } from '@tanstack/vue-table'
import dayjs from 'dayjs'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()
const { listUserServiceAccounts, deleteServiceAccount } = useAccessKeys()

interface RowData {
  accessKey: string
  expiration: string | null
  name: string
  description: string
  accountStatus: string
}

const data = ref<RowData[]>([])
const loading = ref(false)
const searchTerm = ref('')

const TableButton = Button as unknown as any

const openEditItem = (row: RowData) => {
  editItemRef.value?.openDialog(row)
}

const confirmDeleteSingle = (row: RowData) => {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete this key?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: () => deleteItem(row.accessKey),
  })
}

const columns: ColumnDef<RowData>[] = [
  {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) =>
      h(Checkbox, {
        checked: table.getIsAllPageRowsSelected(),
        indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
        'onUpdate:checked': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
        class: 'translate-y-[2px]'
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        checked: row.getIsSelected(),
        'onUpdate:checked': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        class: 'translate-y-[2px]'
      }),
    size: 48,
  },
  {
    accessorKey: 'accessKey',
    header: () => t('Access Key'),
    cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, row.original.accessKey),
    filterFn: 'includesString',
  },
  {
    accessorKey: 'expiration',
    header: () => t('Expiration'),
    cell: ({ row }) =>
      h('span', row.original.expiration ? dayjs(row.original.expiration).format('YYYY-MM-DD HH:mm') : '-'),
  },
  {
    accessorKey: 'accountStatus',
    header: () => t('Status'),
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.accountStatus === 'on' ? 'secondary' : 'destructive' },
        () => (row.original.accountStatus === 'on' ? t('Available') : t('Disabled'))
      ),
  },
  {
    accessorKey: 'name',
    header: () => t('Name'),
    cell: ({ row }) => h('span', row.original.name || '-'),
  },
  {
    accessorKey: 'description',
    header: () => t('Description'),
    cell: ({ row }) => h('span', row.original.description || '-'),
  },
  {
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) =>
      h('div', { class: 'flex justify-center gap-2' }, [
        h(TableButton, {
          variant: 'outline',
          size: 'sm',
          onClick: () => openEditItem(row.original),
        }, () => [h(Icon, { name: 'ri:edit-2-line', class: 'size-4' }), h('span', t('Edit'))]),
        h(TableButton, {
          variant: 'outline',
          size: 'sm',
          onClick: () => confirmDeleteSingle(row.original),
        }, () => [h(Icon, { name: 'ri:delete-bin-5-line', class: 'size-4' }), h('span', t('Delete'))])
      ]),
  },
]

const { table } = useDataTable<RowData>({
  data,
  columns,
  getRowId: row => row.accessKey,
})

watch(searchTerm, value => {
  table.getColumn('accessKey')?.setFilterValue(value || undefined)
})

const selectedKeys = computed(() => table.getSelectedRowModel().rows.map(row => row.original.accessKey))

const listUserAccounts = async () => {
  loading.value = true
  try {
    const res = await listUserServiceAccounts({})
    data.value = res.accounts || []
  } catch (error) {
    console.error(error)
    message.error(t('Get Data Failed'))
  } finally {
    loading.value = false
  }
}

onMounted(listUserAccounts)

const refresh = () => {
  listUserAccounts()
}

const newItemRef = ref()
const newItemVisible = ref(false)
const editItemRef = ref()
const changePasswordModalRef = ref()
const changePasswordVisible = ref(false)
const noticeRef = ref()

function addItem() {
  newItemVisible.value = true
}

function noticeDialog(data: any) {
  noticeRef.value?.openDialog(data)
}

async function deleteItem(accessKey: string) {
  try {
    await deleteServiceAccount(accessKey)
    message.success(t('Delete Success'))
    await listUserAccounts()
  } catch (error) {
    console.error(error)
    message.error(t('Delete Failed'))
  }
}

function deleteSelected() {
  if (!selectedKeys.value.length) {
    message.error(t('Please select at least one item'))
    return
  }

  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete all selected keys?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      try {
        await Promise.all(selectedKeys.value.map(key => deleteServiceAccount(key)))
        message.success(t('Delete Success'))
        table.resetRowSelection()
        await listUserAccounts()
      } catch (error) {
        console.error(error)
        message.error(t('Delete Failed'))
      }
    },
  })
}
</script>
