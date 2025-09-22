<template>
  <div>
    <n-modal
      v-model:show="visible"
      :mask-closable="false"
      preset="card"
      :title="t('Batch allocation policies')"
      class="w-1/2"
      :segmented="{
        content: true,
        action: true,
      }"
    >
      <n-card>
        <n-form ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
          <n-flex justify="space-between">
            <n-form-item class="!w-64" label="" path="name">
              <n-input :placeholder="t('Search Policy')" @input="filterName" />
            </n-form-item>

            <n-space>
              <NFlex>
                <NButton secondary @click="changePolicies">{{ t('Submit') }}</NButton>
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
        @update:checked-row-keys="handleCheck"
      />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { type DataTableColumns, type DataTableInst, type DataTableRowKey, NButton, NSpace } from 'naive-ui';
const { listPolicies, setUserOrGroupPolicy } = usePolicies();
const { t } = useI18n();

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
    title: t('Name'),
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
const listData = ref<any[]>([]);
const getPoliciesList = async () => {
  const res = await listPolicies();
  listData.value = Object.keys(res)
    .sort((a, b) => a.localeCompare(b))
    .map(key => {
      return {
        name: key,
        content: res[key],
      };
    });
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

const emit = defineEmits(['changePoliciesSuccess']);
const changePolicies = async () => {
  Promise.all(
    props.checkedKeys.map(item => {
      return setUserOrGroupPolicy({
        policyName: checkedKeys.value,
        userOrGroup: item,
        isGroup: true,
      });
    })
  )
    .then(() => {
      visible.value = false;
      messge.success(t('Edit Success'));
      emit('changePoliciesSuccess');
    })
    .catch(() => {
      messge.error(t('Edit Failed'));
    });
};
</script>

<style lang="scss" scoped></style>
