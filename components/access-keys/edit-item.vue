<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const message = useMessage();
const emit = defineEmits<Emits>();
const { getServiceAccount, updateServiceAccount } = useAccessKeys();
const { $api } = useNuxtApp();

const visible = ref(false);

const defaultFormModal = {
  accesskey: '',
  secretkey: '',
  name: '',
  description: '',
  expiry: null,
  policy: '',
  status: 'on',
};
const formModel = ref({ ...defaultFormModal });

const accessKey = ref<string>('');
async function openDialog(row: any) {
  accessKey.value = row.accessKey;

  try {
    const res = await getServiceAccount(row.accessKey);
    formModel.value = res;
    formModel.value.accesskey = row.accessKey;
    formModel.value.expiry = res.expiration;
    formModel.value.status = res.accountStatus;
    // const userInfo = await $api.get(`/accountinfo`)
    // formModel.value.policy = userInfo.Policy
    visible.value = true;
  } catch (error) {
    message.error(t('Failed to get data'));
  }
}

defineExpose({ openDialog });

interface Emits {
  (e: 'search'): void;
}

function closeModal() {
  visible.value = false;
}

function dateDisabled(ts: number) {
  const date = new Date(ts);
  return date < new Date();
}

async function submitForm() {
  try {
    const res = await updateServiceAccount(accessKey.value, {
      newPolicy: formModel.value.policy || '{}', // 可选，新策略
      newStatus: formModel.value.status, // 可选，新状态
      newName: formModel.value.name, // 可选，新名称
      newDescription: formModel.value.description, // 可选，新描述
      newExpiration: new Date(formModel.value.expiry || '').toISOString(), // 可选，新过期时间
    });
    message.success(t('Updated successfully'));
    closeModal();
    emit('search');
  } catch (error) {
    message.error(t('Update failed'));
  }
}
</script>

<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    :title="t('Edit Key')"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-card>
      <n-form label-placement="left" :model="formModel" label-align="right" :label-width="90">
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-grid-item :span="24" :label="t('Access Key')" path="accesskey">
            <n-input v-model:value="formModel.accesskey" disabled />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" :label="t('Policy')" path="policy">
            <json-editor v-model="formModel.policy" />
          </n-form-item-grid-item>
          <!-- TODO: 时间格式有问题 -->
          <n-form-item-grid-item :span="24" :label="t('Expiry')" path="expiry">
            <n-date-picker
              v-model:value="formModel.expiry"
              :is-date-disabled="dateDisabled"
              type="datetime"
              clearable
            />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" :label="t('Name')" path="name">
            <n-input v-model:value="formModel.name" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" :label="t('Description')" path="description">
            <n-input v-model:value="formModel.description" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" :label="t('Status')" path="status">
            <n-switch v-model:value="formModel.status" checked-value="on" unchecked-value="off" />
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

<style scoped>
.n-date-picker {
  width: 100%;
}
</style>
