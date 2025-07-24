<template>
  <div>
    <n-card>
      <n-form
        ref="formRef"
        :model="searchForm"
        label-placement="left"
        :show-feedback="false"
        v-if="!editStatus"
      >
        <n-flex justify="space-between">
          <n-form-item class="!w-64" label="" path="name">
            <n-input :placeholder="t('Search Account')" @input="filterName" />
          </n-form-item>

          <n-space>
            <NFlex>
              <!-- <NButton secondary @click="deleteByList" :disabled="checkedKeys.length == 0">
                <template #icon>
                  <Icon name="ri:delete-bin-5-line"></Icon>
                </template>
                删除所选
              </NButton> -->
              <NButton secondary @click="addItem">
                <template #icon>
                  <Icon name="ri:add-line"></Icon>
                </template>
                {{ t('Add Account') }}
              </NButton>
            </NFlex>
          </n-space>
        </n-flex>
      </n-form>
      <n-form
        ref="subFormRef"
        v-if="editStatus && editType == 'add'"
        label-placement="left"
        :model="formModel"
        :rules="rules"
        label-align="right"
        :label-width="130"
      >
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-grid-item :span="24" :label="t('Access Key')" path="accessKey">
            <n-input v-model:value="formModel.accessKey" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" :label="t('Secret Key')" path="secretKey">
            <n-input
              v-model:value="formModel.secretKey"
              show-password-on="mousedown"
              type="password"
            />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" :label="t('Expiration')" path="expiry">
            <n-date-picker
              class="!w-full"
              v-model:value="formModel.expiry"
              :is-date-disabled="dateDisabled"
              value-format="yyyy-MM-ddTkk:mm:SSS"
              type="datetime"
              clearable
            />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" :label="t('Name')" path="name">
            <n-input v-model:value="formModel.name" />
          </n-form-item-grid-item>
          <!-- <n-form-item-grid-item :span="24" label="描述" path="comment" v-if="editType == 'add'">
            <n-input v-model:value="formModel.comment" />
          </n-form-item-grid-item> -->
          <n-form-item-grid-item :span="24" :label="t('Description')" path="description">
            <n-input v-model:value="formModel.description" />
          </n-form-item-grid-item>
          <n-form-item-gi :span="24" :label="t('Use main account policy')" path="impliedPolicy">
            <n-switch v-model:value="formModel.impliedPolicy" />
          </n-form-item-gi>
          <n-form-item-gi
            v-if="!formModel.impliedPolicy"
            :span="24"
            :label="t('Current User Policy')"
            path="policy"
          >
            <json-editor v-model="formModel.policy" />
          </n-form-item-gi>
          <!-- <n-form-item-grid-item :span="24" label="状态" v-if="editType == 'edit'" path="accountStatus">
            <n-switch v-model:value="formModel.accountStatus" checked-value="on" unchecked-value="off" />
          </n-form-item-grid-item> -->
        </n-grid>
        <n-space>
          <NFlex justify="center">
            <NButton secondary @click="cancelAdd">{{ t('Cancel') }}</NButton>
            <NButton secondary @click="submitForm">{{ t('Submit') }}</NButton>
          </NFlex>
        </n-space>
      </n-form>
    </n-card>
    <n-data-table
      v-if="!editStatus"
      class="my-4"
      ref="tableRef"
      :columns="columns"
      :data="listData"
      :row-key="rowKey"
      @update:checked-row-keys="handleCheck"
      :pagination="false"
      :bordered="false"
    />
    <!-- 引入account-edit -->
    <users-user-acedit
      v-if="editStatus && editType === 'edit'"
      :user="editData"
      @search="cancelAdd"
    ></users-user-acedit>
  </div>
</template>

<script setup lang="ts">
import {
  type DataTableColumns,
  type DataTableInst,
  type DataTableRowKey,
  type FormItemRule,
  type FormInst,
  NButton,
  NPopconfirm,
  NSpace,
} from 'naive-ui';
import { Icon } from '#components';
import { useI18n } from 'vue-i18n';
// 随机字符串函数
import { makeRandomString } from '~/utils/functions';
const { t } = useI18n();
const { listUserServiceAccounts, createServiceAccount } = useAccessKeys();
const { $api } = useNuxtApp();

const {
  getServiceAccount,
  updateServiceAccount,
  deleteServiceAccount,
  // deleteMultipleServiceAccounts
} = useAccessKeys();

const { getPolicyByUserName } = usePolicies();
// 验证
const rules = ref({
  accessKey: {
    required: true,
    trigger: ['blur', 'input'],
    validator(rule: FormItemRule, value: string) {
      if (!value) {
        return new Error(t('Please enter Access Key'));
      }
      if (value.length < 3 || value.length > 20) {
        return new Error(t('Access Key length must be between 3 and 20 characters'));
      }
      return true;
    },
  },
  secretKey: {
    required: true,
    trigger: ['blur', 'input'],
    validator(rule: FormItemRule, value: string) {
      if (!value) {
        return new Error(t('Please enter Secret Key'));
      }
      if (value.length < 8 || value.length > 40) {
        return new Error(t('Secret Key length must be between 8 and 40 characters'));
      }
      return true;
    },
  },
  expiry: {
    required: true,
    trigger: ['blur', 'change'],
    validator(rule: FormItemRule, value: string) {
      if (!value) {
        return new Error(t('Please select expiration date'));
      }
      return true;
    },
  },
});
const dialog = useDialog();
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
    title: t('Access Key'),
    align: 'center',
    key: 'accessKey',
    filter(value, row) {
      return !!row.accessKey.includes(value.toString());
    },
  },
  {
    title: t('Expiration'),
    align: 'center',
    key: 'expiration',
  },
  {
    title: t('Status'),
    align: 'center',
    key: 'accountStatus',
    render: (row: any) => {
      return row.accountStatus === 'on' ? t('Available') : t('Disabled');
    },
  },
  {
    title: t('Name'),
    align: 'center',
    key: 'name',
  },
  // {
  //   title: "描述",
  //   align: "center",
  //   key: "description",
  // },
  {
    title: t('Actions'),
    key: 'actions',
    align: 'center',
    width: 125,
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
                default: () => t('Confirm Delete'),
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
  const res = await listUserServiceAccounts({ user: props.user.accessKey });
  listData.value = res.accounts;
  console.log('🚀 ~ getUserList ~ listData.value:', listData.value);
};
getUserList();

/** ***********************************编辑、新增 */
const editStatus = ref(false);
const editType = ref('add');

const formModel = ref({
  accessKey: makeRandomString(20),
  secretKey: makeRandomString(40),
  name: '',
  description: '',
  impliedPolicy: true,
  expiry: null,
  policy: '',
  accountStatus: 'on',
});

const parentPolicy = ref('');
// 默认策略原文
const getPolicie = async () => {
  parentPolicy.value = JSON.stringify(await getPolicyByUserName(props.user.accessKey));
};
getPolicie();

// 新增
function addItem() {
  editType.value = 'add';
  editStatus.value = true;
  formModel.value = {
    accessKey: makeRandomString(20),
    secretKey: makeRandomString(40),
    name: '',
    description: '',
    impliedPolicy: true,
    expiry: null,
    accountStatus: 'on',
    policy: parentPolicy.value,
  };
}
// 编辑
const editData = ref({});
async function openEditItem(row: any) {
  editType.value = 'edit';
  editStatus.value = true;
  const res = await getServiceAccount(row.accessKey);
  editData.value = { ...res, accessKey: row.accessKey };
}

function cancelAdd() {
  editStatus.value = false;
  editType.value === 'add';
  formModel.value = {
    accessKey: makeRandomString(20),
    secretKey: makeRandomString(40),
    name: '',
    description: '',
    impliedPolicy: true,
    expiry: null,
    policy: '',
    accountStatus: 'on',
  };
  getUserList();
}

interface Emits {
  (e: 'search'): void;
  (e: 'notice', data: object): void;
}
const emit = defineEmits<Emits>();
const subFormRef = ref<FormInst | null>(null);
async function submitForm() {
  if (editType.value === 'add') {
    subFormRef.value?.validate(async errors => {
      if (!errors) {
        try {
          const res = await createServiceAccount({
            ...formModel.value,
            targetUser: props.user.accessKey,
            policy: !formModel.value.impliedPolicy
              ? JSON.stringify(JSON.parse(formModel.value.policy))
              : null,
            expiration: formModel.value.expiry
              ? new Date(formModel.value.expiry).toISOString()
              : null,
          });

          message.success(t('Add Success'));
          cancelAdd();
          emit('notice', res);
          getUserList();
        } catch (error) {
          console.log(error);
          message.error(t('Add Failed'));
        }
      } else {
        console.log(errors);
        message.error(t('Please fill in the correct format'));
      }
    });
  } else {
    try {
      const res = await updateServiceAccount(formModel.value.secretKey, {
        ...formModel.value,
        policy: formModel.value.policy || '{}',
        expiry: new Date(formModel.value.expiry || 0).toISOString(),
      });
      message.success(t('Edit Success'));
      cancelAdd();
      getUserList();
    } catch (error) {
      message.error(t('Edit Failed'));
    }
  }
}
function dateDisabled(ts: number) {
  const date = new Date(ts);
  return date < new Date();
}
/** ***********************************删除 */
async function deleteItem(row: any) {
  try {
    const res = await deleteServiceAccount(row.accessKey);
    message.success(t('Delete Success'));
    getUserList();
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
        getUserList();
        message.success(t('Delete Success'));
      } catch (error) {
        message.error(t('Delete Failed'));
      }
    },
  });
}
</script>

<style lang="scss" scoped></style>
