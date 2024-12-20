<template>
  <div>
    <n-form class="mb-4 mt-2" ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
      <n-flex justify="space-between">
        <n-form-item label="" path="name">
          <n-input placeholder="搜索访问用户" @input="filterName" />
        </n-form-item>
        <n-space>
          <NFlex>
            <NButton :disabled="true" secondary @click="deleteByList">
              <template #icon>
                <Icon name="ri:delete-bin-5-line"></Icon>
              </template>
              删除选中项
            </NButton>
            <NButton :disabled="true" secondary @click="addToGroup">
              <template #icon>
                <Icon name="ri:group-2-fill"></Icon>
              </template>
              添加到分组
            </NButton>
            <NButton secondary @click="addUserItem">
              <template #icon>
                <Icon name="ri:add-line"></Icon>
              </template>
              新增用户
            </NButton>
          </NFlex>
        </n-space>
      </n-flex>
    </n-form>
    <n-data-table
      ref="tableRef"
      :columns="columns"
      :data="listData"
      :pagination="false"
      :bordered="true"
      :row-key="rowKey"
      @update:checked-row-keys="handleCheck" />
    <newUser @search="getDataList" ref="newItemRef"></newUser>
    <userEdit @search="getDataList" :checkedKeys="checkedKeys" ref="editItemRef"></userEdit>
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
import { newUser, userEdit } from '../components';

const { $api } = useNuxtApp();
const { listUsers } = useUsers();
const dialog = useDialog();
const message = useMessage();

const searchForm = reactive({
  accessKey: '',
});
interface RowData {
  accessKey: string;
}

const columns: DataTableColumns<RowData> = [
  {
    type: 'selection',
  },
  {
    title: '名称',
    align: 'left',
    key: 'accessKey',
    filter(value, row) {
      return !!row.accessKey.includes(value.toString());
    },
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
                onClick: () => openEditItem(row),
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
      accessKey: [value],
    });
}
const listData = ref<any[]>([]);

onMounted(() => {
  getDataList();
});
// 获取数据
const getDataList = async () => {
  try {
    const res = await listUsers();
    listData.value = res.users || [];
  } catch (error) {
    message.error('获取数据失败');
  }
};

/** **********************************添加 */
const newItemRef = ref();

function addUserItem() {
  newItemRef.value.openDialog();
}

/** **********************************添加到的分组 */
const addToGroup = () => {};

/** **********************************修改 */
const editItemRef = ref();
function openEditItem(row: any) {
  editItemRef.value.openDialog(row);
}
/** ***********************************删除 */
async function deleteItem(row: any) {
  try {
    const res = await $api.delete('/', {
      body: [row.accessKey],
    });
    message.success('删除成功');
    getDataList();
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
  dialog.error({
    title: '警告',
    content: '你确定要删除所有选中的用户吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (!checkedKeys.value.length) {
        message.error('请至少选择一项');
        return;
      }
      try {
        const res = await $api.delete('/', {
          body: checkedKeys.value,
        });
        message.success('删除成功');
        getDataList();
      } catch (error) {
        message.error('删除失败');
      }
    },
  });
}
</script>

<style lang="scss" scoped></style>
