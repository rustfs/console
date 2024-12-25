<template>
  <div>
    <n-card>
      <n-form ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
        <n-flex justify="space-between" v-if="!editStatus">
          <n-form-item class="!w-64" label="" path="name">
            <n-input placeholder="搜索分组" @input="filterName" />
          </n-form-item>

          <n-space>
            <NFlex>
              <NButton secondary @click="editStatus = true">
                <template #icon>
                  <Icon name="ri:add-line"></Icon>
                </template>
                编辑分组
              </NButton>
            </NFlex>
          </n-space>
        </n-flex>
        <n-flex justify="space-between" v-else>
          <n-form-item class="!w-96" label="选择分组" path="group">
            <n-select v-model:value="group" filterable multiple :options="groupList" />
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
const { listGroup } = useGroups();
const { updateUserGroups } = useUsers();

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
    props.user.memberOf?.map((item: string) => {
      return {
        name: item,
      };
    }) || []
  );
});

/********************编辑****************/
const editStatus = ref(false);
// 用户组
const groupList = ref([]);

const emit = defineEmits<{
  (e: 'search'): void;
}>();
const getGroupList = async () => {
  const res = await listGroup();
  console.log(res);
  groupList.value = res.groups.map((item: any) => {
    return {
      label: item,
      value: item,
    };
  });
};
getGroupList();

const group = ref(props.user.memberOf);
const changeMebers = async () => {
  try {
    await updateUserGroups(props.user.accessKey, {
      ...props.user,
      groups: group.value,
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
