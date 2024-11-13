<script lang="ts" setup>
import { useBoolean } from '@/hooks'
import { listUserServiceAccounts, type ServiceAccount } from '@/service'
import IconParkOutlineDelete from '~icons/icon-park-outline/delete'
import IconParkOutlineEdit from '~icons/icon-park-outline/edit'
import IconParkOutlineKey from '~icons/icon-park-outline/key'
import IconParkOutlinePlus from '~icons/icon-park-outline/plus'
import { type DataTableColumns, type DataTableInst, NButton, NEl } from 'naive-ui'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

// const { t } = useI18n()
const router = useRouter()
const searchForm = reactive({
  name: '',
})

const columns = reactive<DataTableColumns<ServiceAccount>>([
  {
    title: 'Access Key',
    align: 'center',
    key: 'accessKey',
    filter(value: any, row: ServiceAccount) {
      return row.accessKey && row.accessKey.includes(value)
    },
  },
  {
    title: '有效期',
    align: 'center',
    key: 'expiration',
  },
  {
    title: '状态',
    align: 'center',
    key: 'accountStatus',
    render: (row) => {
      return row.accountStatus === 'on' ? '可用' : '禁用'
    },
  },
  {
    title: '名称',
    align: 'center',
    key: 'name',
  },
  {
    title: '描述',
    align: 'center',
    key: 'description',
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render() {
      return h(NEl, {
        onClick: (e) => {
          e.stopPropagation()
        },
      }, [
        h(NButton, {
          class: 'me-4 center',
          circle: true,
          secondary: true,
          type: 'info',
        }, {
          icon: () => {
            return h(IconParkOutlineEdit, {
              onClick: (e) => {
                e.stopPropagation()
                // console.log('row---1', row)
              },
            })
          },
        }),
        h(NButton, {
          class: 'me-4',
          circle: true,
          secondary: true,
          type: 'error',
        }, {
          icon: () => {
            return h(IconParkOutlineDelete, {
              onClick: (e) => {
                e.stopPropagation()
                // console.log('row---2', row)
              },
            })
          },
        }),
      ])
    },
  },
])

// 点击行
function goDetail(row: ServiceAccount) {
  return {
    style: 'cursor: pointer;',
    onClick: () => {
      // console.log('row---', row)
      router.push({
        name: 'path',
        params: {
          path: row.name,
        },
      })
    },
  }
}

// 搜索过滤
const tableRef = ref<DataTableInst>()
function filterName(value: string) {
  tableRef.value && tableRef.value.filter({
    name: [value],
  })
}
const listData = ref<ServiceAccount[]>([])

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

onMounted(() => {
  getDataList()
})
// 获取数据
function getDataList() {
  startLoading()
  listUserServiceAccounts({}).then((res: any) => {
    listData.value = res.data
  }).finally(() => {
    endLoading()
  })
}
</script>

<template>
  <div>
    <n-card>
      <template #header>
        <n-form ref="formRef" :model="searchForm" label-placement="left" inline :show-feedback="false">
          <n-flex>
            <n-form-item label="" path="name">
              <n-input placeholder="搜索访问秘钥" @input="filterName" />
            </n-form-item>
          </n-flex>
        </n-form>
      </template>
      <template #header-extra>
        <NFlex>
          <NButton type="primary" secondary @click="getDataList">
            <template #icon>
              <IconParkOutlineDelete />
            </template>
            删除选中项
          </NButton>
          <NButton type="info" secondary @click="getDataList">
            <template #icon>
              <IconParkOutlineKey />
            </template>
            修改秘钥
          </NButton>
          <NButton type="info" secondary @click="getDataList">
            <template #icon>
              <IconParkOutlinePlus />
            </template>
            新增访问秘钥
          </NButton>
        </NFlex>
      </template>
      <n-data-table
        ref="tableRef"
        :columns="columns" :data="listData" :loading="loading" :pagination="false"
        :bordered="false"
        max-height="calc(100vh - 320px)"
        :row-props="goDetail"
      />
    </n-card>
  </div>
</template>

<style lang="scss" scoped>

</style>
