<template>
  <div>
    <n-card>
      <n-form ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
        <n-flex justify="space-between" v-if="!editStatus">
          <n-form-item class="!w-64" label="" path="name">
            <n-input placeholder="搜索账号" @input="filterName" />
          </n-form-item>

          <n-space>
            <NFlex>
              <NButton secondary @click="editStatus = true">
                <template #icon>
                  <Icon name="ri:add-line"></Icon>
                </template>
                添加账号
              </NButton>
            </NFlex>
          </n-space>
        </n-flex>
        <!-- <n-flex justify="space-between" v-else>
          <n-form-item class="!w-96" label="选择策略" path="policy">
            <n-select v-model:value="policy" filterable multiple :options="policyList" />
          </n-form-item>
          <n-space>
            <NFlex>
              <NButton secondary @click="changeMebers">提交</NButton>
            </NFlex>
          </n-space>
        </n-flex> -->
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
import {
  type DataTableColumns,
  type DataTableInst,
  type DataTableRowKey,
  NButton,
  NPopconfirm,
  NSpace,
} from 'naive-ui';
import { Icon } from '#components';
const { listAUserServiceAccounts } = useUsers();
const { listPolicies } = usePolicies();

const message = useMessage();
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
  accessKey: string;
  expiration: string;
  name: string;
  description: string;
  accountStatus: string;
  actions: string;
}
const columns: DataTableColumns<RowData> = [
  {
    type: 'selection',
  },
  {
    title: 'Access Key',
    align: 'center',
    key: 'accessKey',
    filter(value, row) {
      return !!row.accessKey.includes(value.toString());
    },
  },
  {
    title: '有效期',
    align: 'center',
    key: 'expiration',
  },
  {
    title: '状态',
    align: 'center',
    key: 'accountStatus',
    render: (row: any) => {
      return row.accountStatus === 'on' ? '可用' : '禁用';
    },
  },
  {
    title: '名称',
    align: 'center',
    key: 'name',
  },
  {
    title: '描述',
    align: 'center',
    key: 'description',
  },
  {
    title: '操作',
    key: 'actions',
    align: 'center',
    width: 180,
    render: (row: any) => {
      return h(
        NSpace,
        {
          justify: 'center',
        },
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                secondary: true,
                // onClick: () => openEditItem(row),
              },
              {
                default: () => '',
                icon: () => h(Icon, { name: 'ri:edit-2-line' }),
              }
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => deleteItem(row) },
              {
                default: () => '确认删除',
                trigger: () =>
                  h(
                    NButton,
                    { size: 'small', secondary: true },
                    {
                      default: () => '',
                      icon: () => h(Icon, { name: 'ri:delete-bin-5-line' }),
                    }
                  ),
              }
            ),
          ],
        }
      );
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
const getUserList = async () => {
  const res = await listAUserServiceAccounts(props.user.accessKey);
  listData.value = res;
};
getUserList();

//
const editStatus = ref(false);

/** ***********************************删除 */
async function deleteItem(row: any) {
  try {
    // const res = await $api.delete('/service-accounts/delete-multi', {
    //   body: [row.accessKey],
    // });
    message.success('删除成功');
  } catch (error) {
    message.error('删除失败');
  }
}

/** ************************************批量删除 */
function rowKey(row: any): string {
  return row.accessKey;
}

const checkedKeys = ref<DataTableRowKey[]>([]);
function handleCheck(keys: DataTableRowKey[]) {
  checkedKeys.value = keys;
  return checkedKeys;
}
function deleteByList() {
  // dialog.error({
  //   title: '警告',
  //   content: '你确定要删除所有选中的秘钥吗？',
  //   positiveText: '确定',
  //   negativeText: '取消',
  //   onPositiveClick: async () => {
  //     if (!checkedKeys.value.length) {
  //       message.error('请至少选择一项');
  //       return;
  //     }
  //     try {
  //       // const res = await $api.delete('/service-accounts/delete-multi', {
  //       //   body: checkedKeys.value,
  //       // });
  //       message.success('删除成功');
  //     } catch (error) {
  //       message.error('删除失败');
  //     }
  //   },
  // });
}
</script>

<style lang="scss" scoped></style>
