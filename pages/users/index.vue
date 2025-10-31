<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Users') }}</h1>
      <template #actions>
        <SearchInput v-model="searchTerm" :placeholder="t('Search Access User')" clearable class="max-w-xs" />
        <Button type="button" variant="outline" :disabled="!selectedKeys.length" @click="deleteByList">
          <Icon class="size-4" name="ri:delete-bin-5-line" />
          {{ t('Delete Selected') }}
        </Button>
        <Button type="button" variant="outline" :disabled="!selectedKeys.length" @click="addToGroup">
          <Icon class="size-4" name="ri:group-2-fill" />
          {{ t('Add to Group') }}
        </Button>
        <Button type="button" variant="outline" @click="addUserItem">
          <Icon class="size-4" name="ri:add-line" />
          {{ t('Add User') }}
        </Button>
      </template>
    </page-header>

    <div class="space-y-4">
      <DataTable
        :table="table"
        :is-loading="loading"
        :empty-title="t('No Data')"
        :empty-description="t('Create a user to get started.')"
        table-class="min-w-full"
      />
      <DataTablePagination :table="table" />

      <user-new-form ref="newItemRef" @search="getDataList" />
      <user-edit-form ref="editItemRef" @search="getDataList" />
    </div>
  </page>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import DataTablePagination from '@/components/data-table/data-table-pagination.vue'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { ColumnDef } from '@tanstack/vue-table'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { listUsers, deleteUser } = useUsers()
const dialog = useDialog()
const message = useMessage()

interface UserRow {
  accessKey: string
  [key: string]: unknown
}

const searchTerm = ref('')
const loading = ref(false)
const listData = ref<UserRow[]>([])

const newItemRef = ref()
const editItemRef = ref()

async function deleteItem(row: UserRow) {
  try {
    await deleteUser(row.accessKey)
    message.success(t('Delete Success'))
    table.resetRowSelection()
    await getDataList()
  } catch (error) {
    message.error(t('Delete Failed'))
  }
}

function openEditItem(row: UserRow) {
  editItemRef.value?.openDialog(row)
}

function addUserItem() {
  newItemRef.value?.openDialog()
}

const addToGroup = () => {}

async function getDataList() {
  loading.value = true
  try {
    const res = await listUsers()
    listData.value = Object.entries(res).map(([username, info]) => ({
      accessKey: username,
      ...(typeof info === 'object' ? info : {}),
    }))
  } catch (error) {
    message.error(t('Failed to get data'))
  } finally {
    loading.value = false
  }
  table.resetRowSelection()
}

const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: 'accessKey',
    header: () => t('Name'),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.accessKey),
    filterFn: 'includesString',
  },
  {
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h(
          Button,
          {
            type: 'button',
            size: 'sm',
            variant: 'outline',
            onClick: () => openEditItem(row.original),
          },
          () => [h(Icon, { class: 'size-4', name: 'ri:edit-2-line' }), h('span', t('Edit'))]
        ),
        h(
          AlertDialog,
          {},
          {
            default: () => [
              h(
                AlertDialogTrigger,
                { asChild: true },
                {
                  default: () =>
                    h(
                      Button,
                      {
                        type: 'button',
                        size: 'sm',
                        variant: 'outline',
                      },
                      () => [h(Icon, { class: 'size-4', name: 'ri:delete-bin-5-line' }), h('span', t('Delete'))]
                    ),
                }
              ),
              h(
                AlertDialogContent,
                {},
                {
                  default: () => [
                    h(AlertDialogHeader, {}, { default: () => h(AlertDialogTitle, {}, () => t('Confirm Delete')) }),
                    h(
                      AlertDialogFooter,
                      {},
                      {
                        default: () => [
                          h(AlertDialogCancel, {}, () => t('Cancel')),
                          h(
                            AlertDialogAction,
                            {
                              onClick: () => deleteItem(row.original),
                            },
                            () => t('Delete')
                          ),
                        ],
                      }
                    ),
                  ],
                }
              ),
            ],
          }
        ),
      ]),
  },
]

const { table, selectedRows, selectedRowIds } = useDataTable<UserRow>({
  data: listData,
  columns,
  getRowId: row => row.accessKey,
  enableRowSelection: true,
})

const selectedKeys = computed(() => selectedRowIds.value)

function deleteByList() {
  if (!selectedKeys.value.length) return
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete all selected users?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      try {
        await Promise.all(selectedKeys.value.map(item => deleteUser(item)))
        message.success(t('Delete Success'))
        table.resetRowSelection()
        await getDataList()
      } catch (error) {
        message.error(t('Delete Failed'))
      }
    },
  })
}

watch(searchTerm, value => {
  table.getColumn('accessKey')?.setFilterValue(value || undefined)
})

onMounted(() => {
  getDataList()
})
</script>
