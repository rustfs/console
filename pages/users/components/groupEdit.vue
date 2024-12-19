<template>
  <div>
    <n-modal
      v-model:show="visible"
      :mask-closable="false"
      preset="card"
      :title="group.name"
      class="w-1/2"
      :segmented="{
        content: true,
        action: true,
      }">
      <n-tabs type="card">
        <n-tab-pane name="users" tab="成员">
          <groupMembers :group="group" @search="getGroupData(group.name)"></groupMembers>
        </n-tab-pane>
        <n-tab-pane name="userGroup" tab="策略">
          <groupPolicies :group="group" @search="getGroupData(group.name)"></groupPolicies>
        </n-tab-pane>
        <template #suffix>
          状态
          <n-switch
            class="ml-2"
            checked-value="enabled"
            unchecked-value="disabled"
            v-model:value="group.status"
            :on-update:value="handerGroupStatusChange"></n-switch>
        </template>
      </n-tabs>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { groupMembers, groupPolicies } from './';
const visible = ref(false);
const { getGroupInfo, groupUpdate } = useGroups();

interface GroupInfo {
  name: string;
  members: string[];
  status: string;
}

const groupStatus = computed<boolean>(() => {
  return group.value.status == 'enabled' ? true : false;
});
const group = ref<GroupInfo>({
  name: '',
  members: [],
  status: 'enabled',
});

// 用户组的状态发生变化
const handerGroupStatusChange = async (val: string) => {
  await groupUpdate(group.value.name, { ...group.value, status: val });
  await getGroupData(group.value.name);
};
async function openDialog(row: any) {
  await getGroupData(row.name);
  visible.value = true;
}

// 获取用户信息
async function getGroupData(name: string) {
  group.value = await getGroupInfo(name);
}
function closeModal() {
  visible.value = false;
}

defineExpose({
  openDialog,
});
</script>

<style lang="scss" scoped></style>
