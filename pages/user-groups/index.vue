<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('User Groups') }}</h1>
      <template #actions>
        <SearchInput v-model="searchTerm" :placeholder="t('Search User Group')" clearable class="w-full max-w-md" />
        <Button type="button" variant="outline" :disabled="!selectedKeys.length" @click="allocationPolicy">
          <Icon class="size-4" name="ri:group-2-fill" />
          {{ t('Assign Policy') }}
        </Button>
        <Button type="button" variant="outline" @click="addUserGroup">
          <Icon class="size-4" name="ri:add-line" />
          {{ t('Add User Group') }}
        </Button>
      </template>
    </page-header>

    <DataTable :table="table" :is-loading="loading" :empty-title="t('No Data')" :empty-description="t('Create user groups to organize permissions.')" table-class="min-w-full" />
    <DataTablePagination :table="table" class="px-2 py-3" />

    <user-group-edit-form ref="editItemRef" />
    <user-group-new-form ref="newItemRef" v-model:visible="newItemVisible" @search="getDataList" />
    <user-group-set-policies-mutiple ref="policiesRef" :checkedKeys="selectedKeys" @changePoliciesSuccess="changePoliciesSuccess" />
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
import { Checkbox } from '@/components/ui/checkbox'
import type { ColumnDef } from '@tanstack/vue-table'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const dialog = useDialog()
const message = useMessage()
const group = useGroups()

interface GroupRow {
  name: string
}

const searchTerm = ref('')
const listData = ref<GroupRow[]>([])
const loading = ref(false)

const columns: ColumnDef<GroupRow>[] = [
  {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) =>
      h(Checkbox, {
        checked: table.getIsAllPageRowsSelected(),
        indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
        'onUpdate:checked': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
        class: 'translate-y-0.5',
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        checked: row.getIsSelected(),
        'onUpdate:checked': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        class: 'translate-y-0.5',
      }),
    size: 48,
  },
  {
    accessorKey: 'name',
    header: () => t('Name'),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
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
                    h(AlertDialogFooter, {}, {
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
                    }),
                  ],
                }
              ),
            ],
          }
        ),
      ]),
  },
]

const { table } = useDataTable<GroupRow>({
  data: listData,
  columns,
  getRowId: row => row.name,
})

const selectedKeys = computed(() => table.getSelectedRowModel().rows.map(row => row.original.name))

onMounted(() => {
  getDataList()
})

const getDataList = async () => {
  loading.value = true
  try {
    const res = await group.listGroup()
    listData.value =
      res?.map((item: string) => ({
        name: item,
      })) || []
  } catch (error) {
    message.error(t('Failed to get data'))
  } finally {
    loading.value = false
  }
  table.resetRowSelection()
}

const newItemRef = ref()
const newItemVisible = ref(false)

function addUserGroup() {
  newItemVisible.value = true
}

const policiesRef = ref()
const allocationPolicy = () => {
  policiesRef.value.openDialog()
}

const changePoliciesSuccess = () => {
  table.resetRowSelection()
}

const editItemRef = ref()
function openEditItem(row: GroupRow) {
  editItemRef.value.openDialog(row)
}

async function deleteItem(row: GroupRow) {
  try {
    const info = await group.getGroup(row.name)
    if (info.members.length) {
      message.error(t('Please remove members first'))
      return
    }
    await group.updateGroupMembers({
      group: row.name,
      members: info.members,
      isRemove: true,
      groupStatus: 'enabled',
    })
    message.success(t('Delete Success'))
    await getDataList()
  } catch (error) {
    message.error(t('Delete Failed'))
  }
}

function deleteByList() {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete all selected user groups?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      if (!selectedKeys.value.length) {
        message.error(t('Please select at least one item'))
        return
      }
      try {
        await Promise.all(selectedKeys.value.map(item => group.removeGroup(item)))
        table.resetRowSelection()
        message.success(t('Delete Success'))
        await getDataList()
      } catch (error) {
        message.error(t('Delete Failed'))
      }
    },
  })
}

watch(searchTerm, value => {
  table.getColumn('name')?.setFilterValue(value || undefined)
})
</script>
