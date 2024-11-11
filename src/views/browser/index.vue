<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { reactive, ref } from 'vue'

const searchForm = reactive({
  name: '',
})

const columns: DataTableColumns<Entity.User> = [
  {
    title: '姓名',
    align: 'center',
    key: 'userName',
  },
  {
    title: '年龄',
    align: 'center',
    key: 'age',
  },
]

const listData = ref<Entity.User[]>([])

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

onMounted(() => {
  getDataList()
})
// 获取数据
function getDataList() {
  startLoading()
  await fetchUserPage().then((res: any) => {
    listData.value = res.data.list
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
            <n-form-item label="对象名" path="name">
              <n-input v-model:value="searchForm.name" placeholder="请输入" />
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
        :columns="columns" :data="listData" :loading="loading" :pagination="false"
        :bordered="false"
      />
    </n-card>
  </div>
</template>

<style lang="scss" scoped>

</style>
