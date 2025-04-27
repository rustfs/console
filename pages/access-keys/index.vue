<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Access Keys') }}</h1>
      </template>
      <template #actions></template>
    </page-header>

    <page-content>
      <n-form class="mb-4" ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
        <n-flex justify="space-between">
          <n-form-item label="" path="name">
            <n-input :placeholder="t('Search Access Key')" @input="filterName" />
          </n-form-item>
          <!-- <n-button @click="() => refresh()">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>刷新</span>
          </n-button> -->
          <NFlex>
            <NButton :disabled="!checkedKeys.length" secondary @click="deleteByList">
              <template #icon>
                <Icon name="ri:delete-bin-5-line"></Icon>
              </template>
              {{ t('Delete Selected') }}
            </NButton>
            <!-- <NButton secondary @click="changePassword">
            <template #icon>
              <Icon name="ri:key-2-line"></Icon>
            </template>
            修改秘钥
          </NButton> -->
            <NButton secondary @click="addItem">
              <template #icon>
                <Icon name="ri:add-line"></Icon>
              </template>
              {{ t('Add Access Key') }}
            </NButton>
          </NFlex>
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
    </page-content>
    <NewItem ref="newItemRef" v-model:visible="newItemVisible" @search="getDataList" @notice="noticeDialog" />
    <EditItem ref="editItemRef" @search="getDataList" />
    <ChangePassword ref="changePasswordModalRef" v-model:visible="changePasswordVisible" @search="getDataList" />
    <users-user-notice ref="noticeRef" @search="getDataList"></users-user-notice>
  </div>
</template>

<script lang="ts" setup>
import {
  type DataTableColumns,
  type DataTableInst,
  type DataTableRowKey,
  NButton,
  NPopconfirm,
  NSpace,
} from "naive-ui";
import { Icon } from "#components";
import { ChangePassword, EditItem, NewItem } from "~/components/access-keys";
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { $api } = useNuxtApp();
const dialog = useDialog();
const message = useMessage();
const { listUserServiceAccounts, deleteServiceAccount } = useAccessKeys();

const searchForm = reactive({
  name: "",
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
    type: "selection",
  },
  {
    title: t('Access Key'),
    align: "center",
    key: "accessKey",
    filter(value, row) {
      return !!row.accessKey.includes(value.toString());
    },
  },
  {
    title: t('Expiration'),
    align: "center",
    key: "expiration",
  },
  {
    title: t('Status'),
    align: "center",
    key: "accountStatus",
    render: (row: any) => {
      return row.accountStatus === "on" ? t('Available') : t('Disabled');
    },
  },
  {
    title: t('Name'),
    align: "center",
    key: "name",
  },
  {
    title: t('Description'),
    align: "center",
    key: "description",
  },
  {
    title: t('Actions'),
    key: "actions",
    align: "center",
    width: 180,
    render: (row: any) => {
      return h(
        NSpace,
        {
          justify: "center",
        },
        {
          default: () => [
            h(
              NButton,
              {
                size: "small",
                secondary: true,
                onClick: () => openEditItem(row),
              },
              {
                default: () => "",
                icon: () => h(Icon, { name: "ri:edit-2-line" }),
              }
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => deleteItem(row) },
              {
                default: () => t('Confirm Delete'),
                trigger: () =>
                  h(
                    NButton,
                    { size: "small", secondary: true },
                    {
                      default: () => "",
                      icon: () => h(Icon, { name: "ri:delete-bin-5-line" }),
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
    const res = await listUserServiceAccounts({});
    listData.value = res.accounts || [];
  } catch (error) {
    message.error(t('Get Data Failed'));
  }
};

// 刷新
const refresh = () => {
  getDataList();
};

/** **********************************添加 */
const newItemRef = ref();
const newItemVisible = ref(false);

function addItem() {
  newItemVisible.value = true;
}

// 添加之后的反馈弹窗
const noticeRef = ref();
function noticeDialog(data: any) {
  console.log(data);
  noticeRef.value.openDialog(data);
}

/** **********************************修改 */
const editItemRef = ref();
function openEditItem(row: any) {
  editItemRef.value.openDialog(row);
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
    const res = await deleteServiceAccount(row.accessKey);

    message.success(t('Delete Success'));
    getDataList();
  } catch (error) {
    message.error(t('Delete Failed'));
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
// 批量删除
function deleteByList() {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete all selected keys?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      if (!checkedKeys.value.length) {
        message.error(t('Please select at least one item'));
        return;
      }
      try {
        // const res = await deleteMultipleServiceAccounts({
        //   body: checkedKeys.value
        // })
        checkedKeys.value = [];
        getDataList();
        message.success(t('Delete Success'));
      } catch (error) {
        message.error(t('Delete Failed'));
      }
    },
  });
}
</script>
