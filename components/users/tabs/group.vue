<template>
  <div>
    <n-form
      class="mb-4 mt-2"
      ref="formRef"
      :model="searchForm"
      label-placement="left"
      :show-feedback="false">
      <n-flex justify="space-between">
        <n-form-item label="" path="name">
          <n-input :placeholder="t('Search User Group')" @input="filterName" />
        </n-form-item>
        <n-space>
          <NFlex>
            <!-- <NButton :disabled="!checkedKeys.length" secondary @click="deleteByList">
              <template #icon>
                <Icon name="ri:delete-bin-5-line"></Icon>
              </template>
              删除选中项
            </NButton> -->
            <NButton
              :disabled="!checkedKeys.length"
              secondary
              @click="allocationPolicy">
              <template #icon>
                <Icon name="ri:group-2-fill"></Icon>
              </template>
              {{ t('Assign Policy') }}
            </NButton>
            <NButton secondary @click="addUserGroup">
              <template #icon>
                <Icon name="ri:add-line"></Icon>
              </template>
              {{ t('Add User Group') }}
            </NButton>
          </NFlex>
        </n-space>
      </n-flex>
    </n-form>
    <n-data-table
      ref="tableRef"
      :columns="columns"
      :data="listData"
      :pagination="false"
      :bordered="true"
      max-height="calc(100vh - 320px)"
      :row-key="rowKey"
      @update:checked-row-keys="handleCheck" />
    <users-group-edit ref="editItemRef"></users-group-edit>
    <users-group-new
      v-model:visible="newItemVisible"
      @search="getDataList"
      ref="newItemRef"></users-group-new>
    <users-group-set-policies-mutiple
      :checkedKeys="checkedKeys"
      ref="policiesRef"></users-group-set-policies-mutiple>
  </div>
</template>

<script setup lang="ts">
import {
  type DataTableColumns,
  type DataTableInst,
  type DataTableRowKey,
  NButton,
  NPopconfirm,
  NSpace
} from 'naive-ui'
import { Icon } from '#components'
import { useI18n } from 'vue-i18n'
// import { groupEdit, newGroup, setPoliciesMutiple } from '../components';

const { t } = useI18n()

const { $api } = useNuxtApp()
const dialog = useDialog()
const message = useMessage()
const group = useGroups()

const searchForm = reactive({
  name: ''
})
interface RowData {
  name: string
}

const columns: DataTableColumns<RowData> = [
  {
    type: 'selection'
  },
  {
    title: t('Name'),
    align: 'left',
    key: 'name',
    filter(value, row) {
      return !!row.name.includes(value.toString())
    }
  },
  {
    title: t('Actions'),
    key: 'actions',
    align: 'center',
    width: 180,
    render: (row: any) => {
      return h(
        NSpace,
        {
          justify: 'center'
        },
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                secondary: true,
                onClick: () => openEditItem(row)
              },
              {
                default: () => '',
                icon: () => h(Icon, { name: 'ri:edit-2-line' })
              }
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => deleteItem(row) },
              {
                default: () => t('Confirm Delete'),
                trigger: () =>
                  h(
                    NButton,
                    { size: 'small', secondary: true },
                    {
                      default: () => '',
                      icon: () => h(Icon, { name: 'ri:delete-bin-5-line' })
                    }
                  )
              }
            )
          ]
        }
      )
    }
  }
]

// 搜索过滤
const tableRef = ref<DataTableInst>()
function filterName(value: string) {
  tableRef.value &&
    tableRef.value.filter({
      name: [value]
    })
}
const listData = ref<any[]>([])

onMounted(() => {
  getDataList()
})
// 获取数据
const getDataList = async () => {
  try {
    const res = await group.listGroup()
    listData.value =
      res?.map((item: string) => {
        return {
          name: item
        }
      }) || []
    checkedKeys.value = []
  } catch (error) {
    message.error(t('Failed to get data'))
  }
}

/** **********************************添加 */
const newItemRef = ref()
const newItemVisible = ref(false)

function addUserGroup() {
  newItemVisible.value = true
}

/** **********************************分配策略 */
const policiesRef = ref()
const allocationPolicy = () => {
  policiesRef.value.openDialog()
}

/** **********************************修改 */
const editItemRef = ref()
function openEditItem(row: any) {
  editItemRef.value.openDialog(row)
}

/** ***********************************删除 */
async function deleteItem(row: any) {
  try {
    // 获取组的成员
    const info = await group.getGroup(row.name)
    // 清空组的成员
    await group.updateGroupMembers({
      group: row.name,
      members: info.members,
      isRemove: true,
      groupStatus: 'enabled'
    })
    const t = await group.getGroup(row.name)
    // 删除组
    await group.updateGroupMembers({
      group: row.name,
      members: [],
      isRemove: true,
      groupStatus: 'enabled'
    })
    message.success(t('Delete Success'))
    getDataList()
  } catch (error) {
    message.error(t('Delete Failed'))
  }
}

/** ************************************批量删除 */
function rowKey(row: any): string {
  return row.name
}

const checkedKeys = ref<DataTableRowKey[]>([])
function handleCheck(keys: DataTableRowKey[]) {
  checkedKeys.value = keys
  return checkedKeys
}
function deleteByList() {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete all selected user groups?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: () => {
      if (!checkedKeys.value.length) {
        message.error(t('Please select at least one item'))
        return
      }
      checkedKeys.value.forEach(async (element: any) => {
        const res = await group.removeGroup(element)
      })

      getDataList()
    }
  })
}
</script>

<style lang="scss" scoped></style>
