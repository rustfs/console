<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">访问密钥</h1>
      </template>
      <template #actions>
        <NFlex>
          <NButton
            type="primary"
            :disabled="!checkedKeys.length"
            secondary
            @click="deleteByList">
            <template #icon>
              <Icon name="ri:delete-bin-5-line"></Icon>
            </template>
            删除选中项
          </NButton>
          <NButton type="info" secondary @click="changePassword">
            <template #icon>
              <Icon name="ri:key-2-line"></Icon>
            </template>
            修改秘钥
          </NButton>
          <NButton type="info" secondary @click="addItem">
            <template #icon>
              <Icon name="ri:add-line"></Icon>
            </template>
            新增访问秘钥
          </NButton>
        </NFlex>
      </template>
    </page-header>

    <page-content>
      <n-card>
        <n-form
          ref="formRef"
          :model="searchForm"
          label-placement="left"
          inline
          :show-feedback="false">
          <n-flex>
            <n-form-item class="!w-64" label="" path="name">
              <n-input placeholder="搜索访问秘钥" @input="filterName" />
            </n-form-item>
          </n-flex>
        </n-form>
      </n-card>

      <n-data-table
        ref="tableRef"
        :columns="columns"
        :data="listData"
        :pagination="false"
        :bordered="false"
        max-height="calc(100vh - 320px)"
        :row-key="rowKey"
        @update:checked-row-keys="handleCheck" />
    </page-content>
    <NewItem
      ref="newItemRef"
      v-model:visible="newItemVisible"
      @search="getDataList" />
    <EditItem ref="editItemRef" @search="getDataList" />
    <ChangePassword
      ref="changePasswordModalRef"
      v-model:visible="changePasswordVisible"
      @search="getDataList" />
  </div>
</template>

<script lang="ts" setup>
import {
  type DataTableColumns,
  type DataTableInst,
  type DataTableRowKey,
  NButton,
  NPopconfirm,
  NSpace
} from 'naive-ui'
import { Icon } from '#components'
import { ChangePassword, EditItem, NewItem } from './components'

const { $api } = useNuxtApp()
const dialog = useDialog()
const message = useMessage()

const searchForm = reactive({
  name: ''
})
interface RowData {
  accessKey: string
  expiration: string
  name: string
  description: string
  accountStatus: string
  actions: string
}

const columns: DataTableColumns<RowData> = [
  {
    type: 'selection'
  },
  {
    title: 'Access Key',
    align: 'center',
    key: 'accessKey',
    filter(value, row) {
      return !!row.accessKey.includes(value.toString())
    }
  },
  {
    title: '有效期',
    align: 'center',
    key: 'expiration'
  },
  {
    title: '状态',
    align: 'center',
    key: 'accountStatus',
    render: (row: any) => {
      return row.accountStatus === 'on' ? '可用' : '禁用'
    }
  },
  {
    title: '名称',
    align: 'center',
    key: 'name'
  },
  {
    title: '描述',
    align: 'center',
    key: 'description'
  },
  {
    title: '操作',
    key: 'actions',
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
                type: 'info',
                size: 'small',
                secondary: true,
                onClick: () => openEditItem(row)
              },
              {
                default: () => '编辑',
                icon: () => h(Icon, { name: 'ri:edit-2-line' })
              }
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => deleteItem(row) },
              {
                default: () => '确认删除',
                trigger: () =>
                  h(
                    NButton,
                    { type: 'error', size: 'small', secondary: true },
                    {
                      default: () => '删除',
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
    const res = await $api.get('service-accounts')
    listData.value = res || []
  } catch (error) {
    message.error('获取数据失败')
  }
}

/** **********************************添加 */
const newItemRef = ref()
const newItemVisible = ref(false)

function addItem() {
  newItemVisible.value = true
}

/** **********************************修改 */
const editItemRef = ref()
function openEditItem(row: any) {
  editItemRef.value.openDialog(row.accessKey)
}
/** **********************************修改密码 */
const changePasswordModalRef = ref()
const changePasswordVisible = ref(false)

function changePassword() {
  changePasswordVisible.value = true
}

/** ***********************************删除 */
async function deleteItem(row: any) {
  try {
    const res = await $api.delete('/service-accounts/delete-multi', {
      body: [row.accessKey]
    })
    message.success('删除成功')
    getDataList()
  } catch (error) {
    message.error('删除失败')
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
    title: '警告',
    content: '你确定要删除所有选中的秘钥吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (!checkedKeys.value.length) {
        message.error('请至少选择一项')
        return
      }
      try {
        const res = await $api.delete('/service-accounts/delete-multi', {
          body: checkedKeys.value
        })
        message.success('删除成功')
        getDataList()
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}
</script>
