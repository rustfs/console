<script lang="ts" setup>
import type { DataTableColumns, DataTableInst } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { type Bucket, listBuckets } from '@/service'
import { niceBytes } from '@/utils/tools'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const searchForm = reactive({
  name: '',
})

const columns = reactive<DataTableColumns<Bucket>>([
  {
    title: '名称',
    align: 'center',
    key: 'name',
    filter(value: any, row: Bucket) {
      return row.name.includes(value)
    },
  },
  {
    title: '对象数量',
    align: 'center',
    key: 'objects',
    render: (row) => {
      return row.objects || 0
    },
  },
  {
    title: '大小',
    align: 'center',
    key: 'size',
    render: (row) => {
      if (typeof row.size === 'number' || typeof row.size === 'string') {
        return niceBytes(String(row.size))
      }
      return niceBytes(String(0))
    },
  },
  {
    title: '权限',
    align: 'center',
    key: 'rw_access',
    render(row) {
      return (row.rw_access.read
        ? `${t('buckets.read')}/`
        : '') + (row.rw_access.write
        ? t('buckets.write')
        : '')
    },
  },
])

// 点击行
function goDetail(row: Bucket) {
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
const listData = ref<Bucket[]>([])

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

onMounted(() => {
  getDataList()
})
// 获取数据
function getDataList() {
  startLoading()
  listBuckets().then((res: any) => {
    listData.value = res.data.buckets
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
              <n-input placeholder="请输入对象名" @input="filterName" />
            </n-form-item>
          </n-flex>
        </n-form>
      </template>
      <template #header-extra>
        <NFlex>
          <NButton type="primary" secondary @click="getDataList">
            <template #icon>
              <icon-park-outline-refresh />
            </template>
            刷新
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
