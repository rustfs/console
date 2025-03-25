<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">访问密钥</h1>
      </template>
      <template #actions></template>
    </page-header>

    <page-content>
      <n-form class="mb-4" ref="formRef" :model="searchForm" label-placement="left" :show-feedback="false">
        <n-flex justify="space-between">
          <n-form-item label="" path="name">
            <n-input placeholder="搜索访问秘钥" @input="filterName" />
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
              删除选中项
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
              新增访问秘钥
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
    title: "Access Key",
    align: "center",
    key: "accessKey",
    filter(value, row) {
      return !!row.accessKey.includes(value.toString());
    },
  },
  {
    title: "有效期",
    align: "center",
    key: "expiration",
  },
  {
    title: "状态",
    align: "center",
    key: "accountStatus",
    render: (row: any) => {
      return row.accountStatus === "on" ? "可用" : "禁用";
    },
  },
  {
    title: "名称",
    align: "center",
    key: "name",
  },
  {
    title: "描述",
    align: "center",
    key: "description",
  },
  {
    title: "操作",
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
                default: () => "确认删除",
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
    message.error("获取数据失败");
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

    message.success("删除成功");
    getDataList();
  } catch (error) {
    message.error("删除失败");
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
    title: "警告",
    content: "你确定要删除所有选中的秘钥吗？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      if (!checkedKeys.value.length) {
        message.error("请至少选择一项");
        return;
      }
      try {
        await Promise.all(checkedKeys.value.map((item) => deleteServiceAccount(item as string)));
        message.success("删除成功");
        getDataList();
      } catch (error) {
        message.error("删除失败");
      }
    },
  });
}
</script>
