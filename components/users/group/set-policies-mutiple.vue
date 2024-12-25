<template>
  <div>
    <n-modal
      v-model:show="visible"
      :mask-closable="false"
      preset="card"
      title="批量分配策略"
      class="w-1/2"
      :segmented="{
        content: true,
        action: true,
      }">
      <n-card>
        <n-form ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
          <n-flex justify="space-between">
            <n-form-item class="!w-64" label="" path="name">
              <n-input placeholder="搜索策略" @input="filterName" />
            </n-form-item>

            <n-space>
              <NFlex>
                <NButton secondary @click="changePolicies">提交</NButton>
              </NFlex>
            </n-space>
          </n-flex>
        </n-form>
      </n-card>
      <n-data-table
        class="my-4"
        ref="tableRef"
        :columns="columns"
        :data="listData"
        :pagination="false"
        :bordered="false"
        :row-key="rowKey"
        @update:checked-row-keys="handleCheck" />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { type DataTableColumns, type DataTableInst, type DataTableRowKey, NButton, NSpace } from 'naive-ui';
const { listPolicies, setPolicyMultiple } = usePolicies();

const props = defineProps({
  checkedKeys: {
    type: Array,
    required: true,
  },
});
const messge = useMessage();

const visible = ref(false);
async function openDialog() {
  visible.value = true;
}

function closeModal() {
  visible.value = false;
}

defineExpose({
  openDialog,
});

const searchForm = reactive({
  name: '',
});
interface RowData {
  name: string;
}

const columns: DataTableColumns<RowData> = [
  {
    type: 'selection',
  },
  {
    title: '策略',
    align: 'left',
    key: 'name',
    filter(value, row) {
      return !!row.name.includes(value.toString());
    },
  },
];

// 搜索过滤
const tableRef = ref<DataTableInst>();
function filterName(value: string) {
  tableRef.value &&
    tableRef.value.filter({
      name: [value],
    });
}
const listData = ref([]);
const getPoliciesList = async () => {
  const res = await listPolicies();
  listData.value = res.policies || [];
};
getPoliciesList();

/********************编辑****************/
function rowKey(row: any): string {
  return row.name;
}

const checkedKeys = ref<DataTableRowKey[]>([]);
function handleCheck(keys: DataTableRowKey[]) {
  checkedKeys.value = keys;
  return checkedKeys;
}

const changePolicies = async () => {
  try {
    await setPolicyMultiple({
      groups: props.checkedKeys,
      name: checkedKeys.value,
    });
    visible.value = false;
    messge.success('修改成功');
  } catch {
    messge.error('修改失败');
  }
};
</script>

<style lang="scss" scoped></style>
