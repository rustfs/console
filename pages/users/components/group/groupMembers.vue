<template>
  <div>
    <n-card>
      <n-form ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
        <n-flex justify="space-between" v-if="!editStatus">
          <n-form-item class="!w-64" label="" path="name">
            <n-input placeholder="搜索用户" @input="filterName" />
          </n-form-item>

          <n-space>
            <NFlex>
              <NButton secondary @click="editStatus = true">
                <template #icon>
                  <Icon name="ri:add-line"></Icon>
                </template>
                编辑成员
              </NButton>
            </NFlex>
          </n-space>
        </n-flex>
        <n-flex justify="space-between" v-else>
          <n-form-item class="!w-96" label="选择用户组的成员" path="members">
            <n-select v-model:value="members" filterable multiple :options="users" />
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
const { listUsers } = useUsers();
const { updateGroup } = useGroups();

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
    props.group.members.map((item: string) => {
      return {
        name: item,
      };
    }) || []
  );
});

/********************编辑****************/
const editStatus = ref(false);
// 用户列表
const users = ref([]);

const emit = defineEmits<{
  (e: 'search'): void;
}>();
const getUserList = async () => {
  const res = await listUsers();
  users.value = res.users.map((item: any) => {
    return {
      label: item.accessKey,
      value: item.accessKey,
    };
  });
};
getUserList();

const members = ref(props.group.members);
const changeMebers = async () => {
  try {
    await updateGroup(props.group.name, {
      ...props.group,
      members: members.value,
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
