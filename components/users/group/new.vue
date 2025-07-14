<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

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
const users = ref<any[]>([]);
const getUserList = async () => {
  const res = await user.listUsers();

  users.value = Object.entries(res).map(([username, info]) => ({
    label: username, // 添加用户名
    value: username, // 添加用户名
  }));
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
  formModel.value = { ...defaultFormModal };
  emit('update:visible', visible);
}

async function submitForm() {
  if (formModel.value.group.trim() === '') {
    message.error(t('Please enter user group name'));
    return;
  }
  try {
    const res = await group.updateGroupMembers({
      ...formModel.value,
      groupStatus: 'enabled',
      isRemove: false,
    });

    message.success(t('Add success'));
    closeModal();
    emit('search');
  } catch (error) {
    message.error(t('Add failed'));
  }
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    :title="t('Add group members')"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-card>
      <n-form label-placement="left" :model="formModel" label-align="right" :label-width="130">
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-grid-item :span="24" :label="t('Name')" path="group" required>
            <n-input v-model:value="formModel.group" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" :label="t('Users')" path="members">
            <n-select v-model:value="formModel.members" filterable multiple :options="users" />
          </n-form-item-grid-item>
        </n-grid>
      </n-form>
    </n-card>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">{{ t('Cancel') }}</n-button>
        <n-button type="primary" @click="submitForm">{{ t('Submit') }}</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped></style>
