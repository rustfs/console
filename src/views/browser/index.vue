<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { reactive, ref } from 'vue'

const searchForm = reactive({
  name: '',
})

const columns: DataTableColumns<Entity.Bucket> = [
  {
    title: '名称',
    align: 'center',
    key: 'name',
    filter(value, row) {
      return ~row.name.indexOf(value)
    },

  },
  {
    title: '对象数量',
    align: 'center',
    key: 'objectCount',
  },
  {
    title: '大小',
    align: 'center',
    key: 'size',
  },
  {
    title: '权限',
    align: 'center',
    key: 'permission',
  },
]

// 搜索过滤
const tableRef = ref(null)
function filterName(value: string) {
  tableRef.value?.filter({
    name: [value],
  })
}
const listData = ref<Entity.Bucket[]>([])

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

onMounted(() => {
  getDataList()
})
// 获取数据
function getDataList() {
  startLoading()
  // await fetchUserPage().then((res: any) => {
  //   listData.value = res.data.list
  //   endLoading()
  // })
  listData.value = [
    {
      name: 'test',
      objectCount: 1,
      size: 223993,
      permission: 'private',
    },
  ]
  endLoading()
}
</script>

<template>
  <div>
    <n-card>
      <template #header>
        <n-form ref="formRef" :model="searchForm" label-placement="left" inline :show-feedback="false">
          <n-flex>
            <n-form-item label="" path="name">
              <n-input v-model:value="searchForm.name" placeholder="请输入对象名" @change="filterName" />
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
        ref="table"
        :columns="columns" :data="listData" :loading="loading" :pagination="false"
        :bordered="false"
      />
    </n-card>
  </div>
</template>

<style lang="scss" scoped>

</style>
