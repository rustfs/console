<template>
  <div>
    <n-form class="mb-4 mt-2" ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
      <n-flex justify="space-between">
        <n-form-item label="" path="name">
          <n-input :placeholder="t('Search Access User')" @input="filterName" />
        </n-form-item>
        <n-space>
          <NFlex>
            <NButton :disabled="!checkedKeys.length" secondary @click="deleteByList">
              <template #icon>
                <Icon name="ri:delete-bin-5-line"></Icon>
              </template>
              {{ t('Delete Selected') }}
            </NButton>
            <NButton :disabled="!checkedKeys.length" secondary @click="addToGroup">
              <template #icon>
                <Icon name="ri:group-2-fill"></Icon>
              </template>
              {{ t('Add to Group') }}
            </NButton>
            <NButton secondary @click="addUserItem">
              <template #icon>
                <Icon name="ri:add-line"></Icon>
              </template>
              {{ t('Add User') }}
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
      :row-key="rowKey"
      @update:checked-row-keys="handleCheck" />
    <users-user-new @search="getDataList" ref="newItemRef"></users-user-new>
    <users-user-edit @search="getDataList" :checkedKeys="checkedKeys" ref="editItemRef"></users-user-edit>
  </div>
</template>

<script setup lang="ts">
import { type DataTableColumns, type DataTableInst, type DataTableRowKey, NButton, NPopconfirm, NSpace } from "naive-ui"
import { Icon } from "#components"
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { $api } = useNuxtApp()
const { listUsers, deleteUser } = useUsers()
const dialog = useDialog()
const message = useMessage()

const searchForm = reactive({
  accessKey: "",
})
interface RowData {
  accessKey: string
}

const columns: DataTableColumns<RowData> = [
  {
    type: "selection",
  },
  {
    title: t('Name'),
    align: "left",
    key: "accessKey",
    filter(value, row) {
      return !!row.accessKey.includes(value.toString())
    },
  },
  {
    title: t('Actions'),
    key: "actions",
    align: "center",
    width: 180,
    render: (row: any) => {
      return h(
        NSpace,
        {
          justify: "center",
        },
        {
          default: () => [
            h(
              NButton,
              {
                size: "small",
                secondary: true,
                onClick: () => openEditItem(row),
              },
              {
                default: () => "",
                icon: () => h(Icon, { name: "ri:edit-2-line" }),
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
                    { size: "small", secondary: true },
                    {
                      default: () => "",
                      icon: () => h(Icon, { name: "ri:delete-bin-5-line" }),
                    }
                  ),
              }
            ),
          ],
        }
      )
    },
  },
]

// 搜索过滤
const tableRef = ref<DataTableInst>()
function filterName(value: string) {
  tableRef.value &&
    tableRef.value.filter({
      accessKey: [value],
    })
}
const listData = ref<any[]>([])

onMounted(() => {
  getDataList()
})

// 获取数据
const getDataList = async () => {
  try {
    const res = await listUsers()

    listData.value = Object.entries(res).map(([username, info]) => ({
      accessKey: username, // 添加用户名
      ...(typeof info === "object" ? info : {}), // 展开用户信息
    }))
  } catch (error) {
    message.error(t('Failed to get data'))
  }
}

/** **********************************添加 */
const newItemRef = ref()

function addUserItem() {
  newItemRef.value.openDialog()
}

/** **********************************添加到的分组 */
const addToGroup = () => {}

/** **********************************修改 */
const editItemRef = ref()
function openEditItem(row: any) {
  editItemRef.value.openDialog(row)
}
/** ***********************************删除 */
async function deleteItem(row: any) {
  try {
    const res = await deleteUser(row.accessKey)
    message.success(t('Delete Success'))
    getDataList()
  } catch (error) {
    message.error(t('Delete Failed'))
  }
}

/** ************************************批量删除 */
function rowKey(row: any): string {
  return row.accessKey
}

const checkedKeys = ref<DataTableRowKey[]>([])
function handleCheck(keys: DataTableRowKey[]) {
  checkedKeys.value = keys
  return checkedKeys
}
function deleteByList() {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete all selected users?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      if (!checkedKeys.value.length) {
        message.error(t('Please select at least one item'))
        return
      }
      try {
        // 循环遍历删除
        await Promise.all(checkedKeys.value.map((item) => deleteUser(item as string)))
        checkedKeys.value = []
        message.success(t('Delete Success'))
        nextTick(() => {
          getDataList()
        })
      } catch (error) {
        message.error(t('Delete Failed'))
      }
    },
  })
}
</script>

<style lang="scss" scoped></style>
