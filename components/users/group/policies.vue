<template>
  <div>
    <n-card>
      <n-form ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
        <n-flex justify="space-between" v-if="!editStatus">
          <n-form-item class="!w-64" label="" path="name">
            <n-input :placeholder="t('Search Policy')" @input="filterName" />
          </n-form-item>

          <n-space>
            <NFlex>
              <NButton secondary @click="editStatus = true">
                <template #icon>
                  <Icon name="ri:add-line"></Icon>
                </template>
                {{ t('Edit Policy') }}
              </NButton>
            </NFlex>
          </n-space>
        </n-flex>
        <n-flex justify="space-between" v-else>
          <n-form-item class="!w-96" :label="t('Select user group policies')" path="policies">
            <n-select v-model:value="name" filterable multiple :options="polices" />
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
    />
  </div>
</template>

<script setup lang="ts">
import { type DataTableColumns, type DataTableInst, NButton, NSpace } from 'naive-ui';
const { listPolicies, setUserOrGroupPolicy } = usePolicies();
const { t } = useI18n();

const messge = useMessage();
const props = defineProps({
  group: {
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
const listData = computed(() => {
  if (!props.group?.policy) return [];
  return (
    props.group?.policy?.split(',').map((item: string) => {
      return {
        name: item,
      };
    }) || []
  );
});

/********************编辑****************/
const editStatus = ref(false);
// 策略列表
const polices = ref<any[]>([]);

const emit = defineEmits<{
  (e: 'search'): void;
}>();
const getPoliciesList = async () => {
  const res = await listPolicies();
  polices.value = Object.keys(res)
    .sort((a, b) => a.localeCompare(b))
    .map(key => {
      return {
        label: key,
        value: key,
      };
    });
};
getPoliciesList();

// const name = ref(props.group?.policy?.split(',') || [])
const name = ref(props.group?.policy ? props.group?.policy?.split(',') : []);
const changePolicies = async () => {
  try {
    await setUserOrGroupPolicy({
      policyName: name.value || '',
      userOrGroup: encodeURIComponent(props.group.name),
      isGroup: true,
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
