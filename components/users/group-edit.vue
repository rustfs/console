<template>
  <div>
    <n-modal
      v-model:show="visible"
      :mask-closable="false"
      preset="card"
      :title="group.name"
      class="max-w-screen-md"
      :segmented="{
        content: true,
        action: true
      }">
      <n-card>
        <n-tabs type="card">
          <n-tab-pane name="users" tab="成员">
            <users-group-members
              :group="group"
              @search="getGroupData(group.name)"></users-group-members>
          </n-tab-pane>
          <n-tab-pane name="policy" tab="策略">
            <users-group-policies
              :group="group"
              @search="getGroupData(group.name)"></users-group-policies>
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
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
// import { groupMembers, groupPolicies } from './';
const visible = ref(false)
const { getGroup, updateGroup } = useGroups()

interface GroupInfo {
  name: string
  members: string[]
  status: string
}

const group = ref<GroupInfo>({
  name: '',
  members: [],
  status: 'enabled'
})

// 用户组的状态发生变化
const handerGroupStatusChange = async (val: string) => {
  await updateGroup(group.value.name, { ...group.value, status: val })
  await getGroupData(group.value.name)
}
async function openDialog(row: any) {
  getGroupData(row.name)
  visible.value = true
}

// 获取用户信息
async function getGroupData(name: string) {
  group.value = await getGroup(name)
}

defineExpose({
  openDialog
})
</script>

<style lang="scss" scoped></style>
