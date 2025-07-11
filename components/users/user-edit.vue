<template>
  <div>
    <n-modal
      v-model:show="visible"
      :mask-closable="false"
      preset="card"
      :title="user.accessKey"
      class="max-w-screen-md"
      :segmented="{
        content: true,
        action: true,
      }"
    >
      <n-card>
        <n-tabs type="card">
          <n-tab-pane name="groups" :tab="t('Groups')">
            <users-user-groups
              :user="user"
              @search="getUserData(user.accessKey)"
            ></users-user-groups>
          </n-tab-pane>
          <n-tab-pane name="policy" :tab="t('Policies')">
            <users-user-policies
              :user="user"
              @search="getUserData(user.accessKey)"
            ></users-user-policies>
          </n-tab-pane>
          <n-tab-pane name="accesskey" :tab="t('Account')">
            <users-user-account
              :user="user"
              @search="getUserData(user.accessKey)"
              @notice="noticeDialog"
            ></users-user-account>
          </n-tab-pane>
          <template #suffix>
            {{ t('Status') }}
            <n-switch
              class="ml-2"
              checked-value="enabled"
              unchecked-value="disabled"
              v-model:value="user.status"
              :on-update:value="handerUserStatusChange"
            ></n-switch>
          </template>
        </n-tabs>
        <users-user-notice
          ref="noticeRef"
          @search="getUserData(user.accessKey)"
        ></users-user-notice>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const visible = ref(false);
const { getUser, updateUser, changeUserStatus } = useUsers();
interface UserInfo {
  accessKey: string;
  memberOf: string[];
  policy: string[];
  status: string;
}

const user = ref<UserInfo>({
  accessKey: '',
  memberOf: [],
  policy: [],
  status: 'enabled',
});

// 用户的状态发生变化
const handerUserStatusChange = async (val: string) => {
  await changeUserStatus(user.value.accessKey, {
    accessKey: user.value.accessKey,
    status: val,
  });
  await getUserData(user.value.accessKey);
};
async function openDialog(row: any) {
  user.value = row;
  console.log('🚀 ~ openDialog ~ row:', row);
  await getUserData(row.accessKey);
  visible.value = true;
}

// 获取用户信息
async function getUserData(name: string) {
  setTimeout(async () => {
    user.value = await getUser(name);
    user.value.accessKey = name;
  }, 200);
}
// 添加之后的反馈弹窗
const noticeRef = ref();
function noticeDialog(data: any) {
  noticeRef.value.openDialog(data);
}

defineExpose({
  openDialog,
});
</script>

<style lang="scss" scoped></style>
