<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  visible: boolean;
}
const { visible } = defineProps<Props>();
const message = useMessage();
const { $api } = useNuxtApp();
const group = useGroups();
const user = useUsers();

const emit = defineEmits<Emits>();
const defaultFormModal = {
  group: '',
  members: [],
};
const formModel = ref({ ...defaultFormModal });

interface Emits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'search'): void;
}

// 用户列表
const users = ref([]);
const getUserList = async () => {
  // const res = await user.ListUsers();
  const res = await $api.get('/users');

  users.value = res.users.map((item: any) => {
    return {
      label: item.accessKey,
      value: item.accessKey,
    };
  });
};
getUserList();

const modalVisible = computed({
  get() {
    return visible;
  },
  set(visible) {
    closeModal(visible);
  },
});
function closeModal(visible = false) {
  emit('update:visible', visible);
}

async function submitForm() {
  if (formModel.value.group.trim() === '') {
    message.error('请输入用户组名称');
    return;
  }
  try {
    const res = await group.groupAdd({ ...formModel.value });

    message.success('添加成功');
    closeModal();
    emit('search');
  } catch (error) {
    message.error('添加失败');
  }
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    title="添加用户组"
    class="w-1/2"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-form label-placement="left" :model="formModel" label-align="right" :label-width="130">
      <n-grid :cols="24" :x-gap="18">
        <n-form-item-grid-item :span="24" label="名称" path="group" required>
          <n-input v-model:value="formModel.group" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="24" label="用户" path="members">
          <n-select v-model:value="formModel.members" multiple :options="users" />
        </n-form-item-grid-item>
      </n-grid>
    </n-form>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">取消</n-button>
        <n-button type="primary" @click="submitForm">提交</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped></style>
