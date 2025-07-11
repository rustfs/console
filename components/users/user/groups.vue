<template>
  <div>
    <n-card>
      <n-form ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
        <n-flex justify="space-between" v-if="!editStatus">
          <n-form-item class="!w-64" label="" path="name">
            <n-input :placeholder="t('Search Group')" @input="filterName" />
          </n-form-item>

          <n-space>
            <NFlex>
              <NButton secondary @click="editStatus = true">
                <template #icon>
                  <Icon name="ri:add-line"></Icon>
                </template>
                {{ t('Edit Group') }}
              </NButton>
            </NFlex>
          </n-space>
        </n-flex>
        <n-flex justify="space-between" v-else>
          <n-form-item class="!w-96" :label="t('Select Group')" path="group">
            <n-select v-model:value="group" filterable multiple :options="groupList" />
          </n-form-item>
          <n-space>
            <NFlex>
              <NButton secondary @click="changeMebers">{{ t('Submit') }}</NButton>
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
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { listGroup } = useGroups();
// const { updateUserGroups } = useUsers()
const { updateGroupMembers } = useGroups();

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
const groupList = ref(props.user.memberOf || []);

const emit = defineEmits<{
  (e: 'search'): void;
}>();
const getGroupList = async () => {
  const res = await listGroup();
  groupList.value = res.map((item: any) => {
    return {
      label: item,
      value: item,
    };
  });
};
getGroupList();

const group = ref(props.user.memberOf);
// 监听props.user.memberOf变化 并修改group

const changeMebers = async () => {
  try {
    props.user.memberOf?.filter(async (item: string) => {
      if (!group.value.includes(item)) {
        // 删除不存在的
        await updateGroupMembers({
          group: item,
          members: [props.user.accessKey],
          isRemove: true,
          groupStatus: 'enabled',
        });
      }
    });

    // 修改组的成员
    group.value.map(async (element: string) => {
      await updateGroupMembers({
        group: element,
        members: [props.user.accessKey],
        isRemove: false,
        groupStatus: 'enabled',
      });
    });

    messge.success(t('Update Success'));
    editStatus.value = false;
    emit('search');
  } catch (e) {
    console.log(e);
    messge.error(t('Update Failed'));
  }
};
</script>

<style lang="scss" scoped></style>
