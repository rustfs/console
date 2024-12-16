<template>
  <div>
    <n-card>
      <n-form ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
        <n-flex justify="space-between">
          <n-form-item class="!w-64" label="" path="name">
            <n-input placeholder="搜索访问用户" @input="filterName" />
          </n-form-item>
          <n-space>
            <NFlex>
              <NButton type="error" :disabled="true" secondary @click="deleteByList">
                <template #icon>
                  <Icon name="ri:delete-bin-5-line"></Icon>
                </template>
                删除选中项
              </NButton>
              <NButton type="info" :disabled="true" secondary @click="addToGroup">
                <template #icon>
                  <Icon name="ri:group-2-fill"></Icon>
                </template>
                添加到分组
              </NButton>
              <NButton type="info" secondary @click="addUserItem">
                <template #icon>
                  <Icon name="ri:add-line"></Icon>
                </template>
                新增用户
              </NButton>
            </NFlex>
          </n-space>
        </n-flex>
      </n-form>
    </n-card>
    <n-data-table ref="tableRef" :columns="columns" :data="listData" :pagination="false" :bordered="false" max-height="calc(100vh - 320px)" :row-key="rowKey" @update:checked-row-keys="handleCheck" />
  </div>
</template>

<script setup lang="ts">
import { type DataTableColumns, type DataTableInst, type DataTableRowKey, NButton, NPopconfirm, NSpace } from 'naive-ui';
import { Icon } from '#components';
// import { ChangePassword, EditItem, NewItem } from './components';

const { $api } = useNuxtApp();
const dialog = useDialog();
const message = useMessage();

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
    title: '名称',
    align: 'left',
    key: 'name',
  },
  {
    title: '操作',
    key: 'actions',
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
                type: 'info',
                size: 'small',
                secondary: true,
                onClick: () => openEditItem(row),
              },
              {
                default: () => '编辑',
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
                    { type: 'error', size: 'small', secondary: true },
                    {
                      default: () => '删除',
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
const listData = ref<any[]>([]);

onMounted(() => {
  getDataList();
});
// 获取数据
const getDataList = async () => {
  try {
    const res = await $api.get('service-accounts');
    listData.value = res || [];
  } catch (error) {
    message.error('获取数据失败');
  }
};

/** **********************************添加 */
const newItemRef = ref();
const newItemVisible = ref(false);

function addUserItem() {
  newItemVisible.value = true;
}

/** **********************************添加到的分组 */
const addToGroup = () => {};

/** **********************************修改 */
const editItemRef = ref();
function openEditItem(row: any) {
  editItemRef.value.openDialog(row.accessKey);
}
/** **********************************修改密码 */
const changePasswordModalRef = ref();
const changePasswordVisible = ref(false);

function changePassword() {
  changePasswordVisible.value = true;
}

/** ***********************************删除 */
async function deleteItem(row: any) {
  try {
    const res = await $api.delete('/service-accounts/delete-multi', {
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
    content: '你确定要删除所有选中的秘钥吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (!checkedKeys.value.length) {
        message.error('请至少选择一项');
        return;
      }
      try {
        const res = await $api.delete('/service-accounts/delete-multi', {
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
