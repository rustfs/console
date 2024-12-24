<template>
  <div>
    <n-card>
      <n-form ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
        <n-flex justify="space-between" v-if="!editStatus">
          <n-form-item class="!w-64" label="" path="name">
            <n-input placeholder="搜索策略" @input="filterName" />
          </n-form-item>

          <n-space>
            <NFlex>
              <NButton secondary @click="editStatus = true">
                <template #icon>
                  <Icon name="ri:add-line"></Icon>
                </template>
                编辑策略
              </NButton>
            </NFlex>
          </n-space>
        </n-flex>
        <n-flex justify="space-between" v-else>
          <n-form-item class="!w-96" label="选择策略" path="policy">
            <n-select v-model:value="policy" filterable multiple :options="policyList" />
          </n-form-item>
          <n-space>
            <NFlex>
              <NButton secondary @click="changeMebers">提交</NButton>
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
      :bordered="false" />
  </div>
</template>

<script setup lang="ts">
import { type DataTableColumns, type DataTableInst, NButton, NSpace } from 'naive-ui';
const { listPolicies } = usePolicies();
const { setPolicy } = useUsers();

const messge = useMessage();
const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
});

const searchForm = reactive({
  name: '',
});
interface RowData {
  name: string;
}
const columns: DataTableColumns<RowData> = [
  {
    title: '名称',
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
const listData = computed(() => {
  return (
    props.user.policy.map((item: string) => {
      return {
        name: item,
      };
    }) || []
  );
});

/********************编辑****************/
const editStatus = ref(false);
// 策略列表
const policyList = ref([]);

const emit = defineEmits<{
  (e: 'search'): void;
}>();
const getPoliciesList = async () => {
  const res = await listPolicies();
  console.log(res);
  policyList.value = res.policies.map((item: any) => {
    return {
      label: item.name,
      value: item.name,
    };
  });
};
getPoliciesList();

const policy = ref(props.user.policy);
const changeMebers = async () => {
  try {
    await setPolicy({
      name: policy.value,
      entityType: 'user',
      entityName: props.user.accessKey,
    });
    messge.success('修改成功');
    editStatus.value = false;
    emit('search');
  } catch {
    messge.error('修改失败');
  }
};
</script>

<style lang="scss" scoped></style>
