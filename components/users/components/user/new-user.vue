<template>
  <div>
    <n-modal
      v-model:show="visible"
      :mask-closable="false"
      preset="card"
      title="创建用户"
      class="max-w-screen-md"
      :segmented="{
        content: true,
        action: true,
      }">
      <n-card>
        <n-form ref="formRef" :model="editForm" label-placement="left" :show-feedback="false">
          <n-form-item-grid-item :span="24" label="用户名" path="accessKey" required>
            <n-input v-model:value="editForm.accessKey" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="秘钥" path="secretKey" required>
            <n-input v-model:value="editForm.secretKey" type="password" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="分组" path="groups">
            <n-select v-model:value="editForm.groups" filterable multiple :options="groupsList" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="策略" path="policies">
            <n-select v-model:value="editForm.policies" filterable multiple :options="policiesList" />
          </n-form-item-grid-item>
        </n-form>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
const { listPolicies } = usePolicies();
const { listGroup } = useGroups();
const messge = useMessage();
const visible = ref(false);

const editForm = reactive({
  accessKey: '',
  secretKey: '',
  groups: [],
  policies: [],
});
async function openDialog() {
  getPoliciesList();
  getGroupsList();
  visible.value = true;
}

defineExpose({
  openDialog,
});

// 获取策略列表
const policiesList = ref([]);
const getPoliciesList = async () => {
  const res = await listPolicies();
  policiesList.value =
    res.policies.map((item: any) => {
      return {
        label: item.name,
        value: item.name,
      };
    }) || [];
};

// 获取用户组列表
const groupsList = ref([]);
const getGroupsList = async () => {
  const res = await listGroup();
  groupsList.value =
    res.groups.map((item: any) => {
      return {
        label: item,
        value: item,
      };
    }) || [];
};
</script>

<style lang="scss" scoped></style>
