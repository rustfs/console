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
      }">
      <n-card>
        <n-tabs type="card">
          <n-tab-pane name="groups" tab="分组">
            <users-user-groups :user="user" @search="getUserData(user.accessKey)"></users-user-groups>
          </n-tab-pane>
          <n-tab-pane name="policy" tab="策略">
            <users-user-policies :user="user" @search="getUserData(user.accessKey)"></users-user-policies>
          </n-tab-pane>
          <n-tab-pane name="accesskey" tab="账号">
            <users-user-account :user="user" @search="getUserData(user.accessKey)"></users-user-account>
          </n-tab-pane>
          <template #suffix>
            状态
            <n-switch
              class="ml-2"
              checked-value="enabled"
              unchecked-value="disabled"
              v-model:value="user.status"
              :on-update:value="handerUserStatusChange"></n-switch>
          </template>
        </n-tabs>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
// import { userPolicies, userAccount, userGroups } from './components';
const visible = ref(false);
const { getUser, updateUser } = useUsers();
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
  await updateUser(user.value.accessKey, { ...user.value, groups: user.value.memberOf, status: val });
  await getUserData(user.value.accessKey);
};
async function openDialog(row: any) {
  await getUserData(row.accessKey);
  visible.value = true;
}

// 获取用户信息
async function getUserData(name: string) {
  user.value = await getUser(name);
}

defineExpose({
  openDialog,
});
</script>

<style lang="scss" scoped></style>
