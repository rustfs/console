<template>
  <div>
    <n-card>
      <n-form
        ref="formRef"
        :model="searchForm"
        label-placement="left"
        :show-feedback="false"
        v-if="!editStatus">
        <n-flex justify="space-between">
          <n-form-item class="!w-64" label="" path="name">
            <n-input placeholder="搜索账号" @input="filterName" />
          </n-form-item>

          <n-space>
            <NFlex>
              <!-- <NButton secondary @click="deleteByList" :disabled="checkedKeys.length == 0">
                <template #icon>
                  <Icon name="ri:delete-bin-5-line"></Icon>
                </template>
                删除所选
              </NButton> -->
              <NButton secondary @click="addItem">
                <template #icon>
                  <Icon name="ri:add-line"></Icon>
                </template>
                添加账号
              </NButton>
            </NFlex>
          </n-space>
        </n-flex>
      </n-form>
      <n-form
        v-else
        label-placement="left"
        :model="formModel"
        label-align="right"
        :label-width="130">
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-grid-item
            :span="24"
            label="Access Key"
            path="accesskey"
            v-if="editType == 'add'">
            <n-input v-model:value="formModel.accesskey" />
          </n-form-item-grid-item>
          <n-form-item-grid-item
            :span="24"
            label="Secret Key"
            path="secretkey"
            v-if="editType == 'add'">
            <n-input
              v-model:value="formModel.secretkey"
              show-password-on="mousedown"
              type="password" />
          </n-form-item-grid-item>
          <!-- TODO: 时间格式有问题 -->
          <n-form-item-grid-item :span="24" label="有效期" path="expiry">
            <n-date-picker
              class="!w-full"
              v-model:value="formModel.expiry"
              :is-date-disabled="dateDisabled"
              value-format="yyyy-MM-ddTkk:mm:SSS"
              type="datetime"
              clearable />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="名称" path="name">
            <n-input v-model:value="formModel.name" />
          </n-form-item-grid-item>
          <n-form-item-grid-item
            :span="24"
            label="描述"
            path="comment"
            v-if="editType == 'add'">
            <n-input v-model:value="formModel.comment" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="注释" path="description">
            <n-input v-model:value="formModel.description" />
          </n-form-item-grid-item>
          <n-form-item-grid-item
            :span="24"
            label="限制超出用户策略"
            path="flag"
            v-if="editType == 'add'">
            <n-switch v-model:value="formModel.flag" />
          </n-form-item-grid-item>
          <n-form-item-grid-item
            v-if="formModel.flag || editType == 'edit'"
            :span="24"
            label="策略详情"
            path="policy">
            <json-editor v-model="formModel.policy" />
          </n-form-item-grid-item>
          <n-form-item-grid-item
            :span="24"
            label="状态"
            v-if="editType == 'edit'"
            path="status">
            <n-switch
              v-model:value="formModel.status"
              checked-value="on"
              unchecked-value="off" />
          </n-form-item-grid-item>
        </n-grid>
        <n-space>
          <NFlex justify="center">
            <NButton secondary @click="cancelAdd">取消</NButton>
            <NButton secondary @click="submitForm">提交</NButton>
          </NFlex>
        </n-space>
      </n-form>
    </n-card>
    <n-data-table
      v-if="!editStatus"
      class="my-4"
      ref="tableRef"
      :columns="columns"
      :data="listData"
      :row-key="rowKey"
      @update:checked-row-keys="handleCheck"
      :pagination="false"
      :bordered="false" />
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
// 随机字符串函数
import { makeRandomString } from '~/utils/functions'
const { listUserServiceAccounts, createServiceAccount } = useAccessKeys()

const {
  getServiceAccount,
  updateServiceAccount,
  deleteServiceAccount
  // deleteMultipleServiceAccounts
} = useAccessKeys()

const dialog = useDialog()
const message = useMessage()
const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

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
    align: 'center',
    width: 125,
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
                default: () => '确认删除',
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
const listData = ref([])
const getUserList = async () => {
  const res = await listUserServiceAccounts(props.user.accessKey)
  listData.value = res
}
getUserList()

/** ***********************************编辑、新增 */
const editStatus = ref(false)
const editType = ref('add')

const formModel = ref({
  accesskey: makeRandomString(20),
  secretkey: makeRandomString(40),
  name: '',
  description: '',
  comment: '',
  expiry: null,
  policy: '',
  flag: false,
  status: 'on'
})

// 新增
function addItem() {
  editType.value = 'add'
  editStatus.value = true
  formModel.value = {
    accesskey: makeRandomString(20),
    secretkey: makeRandomString(40),
    name: '',
    description: '',
    comment: '',
    expiry: null,
    policy: '',
    flag: false,
    status: 'on'
  }
}
// 编辑
async function openEditItem(row: any) {
  editType.value = 'edit'
  editStatus.value = true
  const res = await getServiceAccount(row.accessKey)
  formModel.value = {
    ...res
  }
  formModel.value.accesskey = row.accessKey
  formModel.value.expiry = res.expiration
  formModel.value.status = res.accountStatus
}

function cancelAdd() {
  editStatus.value = false
  editType.value === 'add'
  formModel.value = {
    accesskey: makeRandomString(20),
    secretkey: makeRandomString(40),
    name: '',
    description: '',
    comment: '',
    expiry: null,
    policy: '',
    flag: false,
    status: 'on'
  }
}

interface Emits {
  (e: 'search'): void
  (e: 'notice', data: object): void
}
const emit = defineEmits<Emits>()
async function submitForm() {
  if (editType.value === 'add') {
    try {
      console.log(formModel.value)
      const res = await createServiceAccount({
        ...formModel.value,
        targetUser: props.user.accessKey,
        expiry: new Date(formModel.value.expiry || 0).toISOString() || ''
      })

      message.success('添加成功')
      cancelAdd()
      emit('notice', res)
      getUserList()
    } catch (error) {
      console.log(error)
      message.error('添加失败')
    }
  } else {
    try {
      const res = await updateServiceAccount(formModel.value.accesskey, {
        ...formModel.value,
        policy: formModel.value.policy || '{}',
        expiry: new Date(formModel.value.expiry || 0).toISOString()
      })
      message.success('修改成功')
      cancelAdd()
      getUserList()
    } catch (error) {
      message.error('修改失败')
    }
  }
}
function dateDisabled(ts: number) {
  const date = new Date(ts)
  return date < new Date()
}
/** ***********************************删除 */
async function deleteItem(row: any) {
  try {
    const res = await deleteServiceAccount(row.accessKey)
    message.success('删除成功')
    getUserList()
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
        // const res = await deleteMultipleServiceAccounts({
        //   body: checkedKeys.value
        // })
        checkedKeys.value = []
        getUserList()
        message.success('删除成功')
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}
</script>

<style lang="scss" scoped></style>
