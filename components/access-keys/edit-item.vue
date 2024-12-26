<script setup lang="ts">
import { ref } from 'vue';
const message = useMessage();
const emit = defineEmits<Emits>();
const { getServiceAccount, updateServiceAccount } = useAccessKeys();

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
    visible.value = true;
  } catch (error) {
    message.error('获取数据失败');
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
      ...formModel.value,
      policy: formModel.value.policy || '{}',
      expiry: new Date(formModel.value.expiry || '').toISOString(),
    });
    message.success('修改成功');
    closeModal();
    emit('search');
  } catch (error) {
    message.error('修改失败');
  }
}
</script>

<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    title="修改秘钥"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-card>
      <n-form label-placement="left" :model="formModel" label-align="right" :label-width="90">
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-grid-item :span="24" label="Access Key" path="policy">
            <json-editor v-model="formModel.policy" />
          </n-form-item-grid-item>
          <!-- TODO: 时间格式有问题 -->
          <n-form-item-grid-item :span="24" label="有效期" path="expiry">
            <n-date-picker
              v-model:value="formModel.expiry"
              :is-date-disabled="dateDisabled"
              type="datetime"
              clearable />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="名称" path="name">
            <n-input v-model:value="formModel.name" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="描述" path="description">
            <n-input v-model:value="formModel.description" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="状态" path="status">
            <n-switch v-model:value="formModel.status" checked-value="on" unchecked-value="off" />
          </n-form-item-grid-item>
        </n-grid>
      </n-form>
    </n-card>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">取消</n-button>
        <n-button type="primary" @click="submitForm">提交</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped>
.n-date-picker {
  width: 100%;
}
</style>
