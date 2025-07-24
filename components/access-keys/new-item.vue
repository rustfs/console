<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    :title="t('Create Key')"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-card>
      <n-form
        ref="formRef"
        label-placement="left"
        :model="formModel"
        :rules="rules"
        label-align="center"
        :label-width="130"
      >
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-gi :span="24" :label="t('Access Key')" path="accessKey">
            <n-input v-model:value="formModel.accessKey" />
          </n-form-item-gi>
          <n-form-item-gi :span="24" :label="t('Secret Key')" path="secretKey">
            <n-input
              v-model:value="formModel.secretKey"
              show-password-on="mousedown"
              type="password"
            />
          </n-form-item-gi>

          <!-- <n-form-item-gi :span="24" label="策略" path="policy">
            <n-select v-model:value="formModel.policy" filterable multiple :options="polices" />
          </n-form-item-gi> -->

          <n-form-item-gi :span="24" :label="t('Expiry')" path="expiry">
            <n-date-picker
              class="!w-full"
              v-model:value="formModel.expiry"
              :is-date-disabled="dateDisabled"
              type="datetime"
              clearable
            />
          </n-form-item-gi>
          <n-form-item-gi :span="24" :label="t('Name')" path="name">
            <n-input v-model:value="formModel.name" />
          </n-form-item-gi>
          <!-- <n-form-item-gi :span="24" label="描述" path="comment">
            <n-input v-model:value="formModel.comment" />
          </n-form-item-gi> -->
          <n-form-item-gi :span="24" :label="t('Description')" path="description">
            <n-input v-model:value="formModel.description" />
          </n-form-item-gi>
          <n-form-item-gi :span="24" :label="t('Use main account policy')" path="impliedPolicy">
            <n-switch v-model:value="formModel.impliedPolicy" />
          </n-form-item-gi>
          <n-form-item-gi
            v-if="!formModel.impliedPolicy"
            :span="24"
            :label="t('Current user policy')"
            path="policy"
          >
            <json-editor v-model="formModel.policy" />
          </n-form-item-gi>
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
<script setup lang="ts">
import type { FormInst, FormItemRule } from 'naive-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { makeRandomString } from '~/utils/functions';

const { t } = useI18n();
interface Props {
  visible: boolean;
}
const { visible } = defineProps<Props>();
const message = useMessage();
const { $api } = useNuxtApp();
const { createServiceAccount } = useAccessKeys();

const emit = defineEmits<Emits>();
const defaultFormModal = {
  accessKey: makeRandomString(20),
  secretKey: makeRandomString(40),
  name: '',
  description: '',
  // comment: "",
  expiry: null,
  policy: '',
  impliedPolicy: true,
};
const formModel = ref({ ...defaultFormModal });

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
    // message: "请选择有效期",
    validator(rule: FormItemRule, value: string) {
      if (!value) {
        return new Error(t('Please select expiry date'));
      }
      return true;
    },
  },
});

interface Emits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'search'): void;
  (e: 'notice', data: object): void;
}

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
  formModel.value = {
    ...defaultFormModal,
    accessKey: makeRandomString(20),
    secretKey: makeRandomString(40),
    policy: JSON.stringify(parentPolicy.value),
  };
}

function dateDisabled(ts: number) {
  const date = new Date(ts);
  return date < new Date();
}

const formRef = ref<FormInst | null>(null);
async function submitForm(e: MouseEvent) {
  // e.preventDefault()
  formRef.value?.validate(async errors => {
    if (!errors) {
      try {
        const res = await createServiceAccount({
          ...formModel.value,
          policy: !formModel.value.impliedPolicy
            ? JSON.stringify(JSON.parse(formModel.value.policy))
            : null,
          expiration: formModel.value.expiry
            ? new Date(formModel.value.expiry).toISOString()
            : null,
        });
        message.success(t('Added successfully'));
        emit('notice', res);
        closeModal();
        emit('search');
      } catch (error) {
        message.error(t('Add failed'));
      }
    } else {
      console.log(errors);
      message.error(t('Please fill in the correct format'));
    }
  });
}

const parentPolicy = ref('');
// 默认策略原文
const getPolicie = async () => {
  const userInfo = await $api.get(`/accountinfo`);
  parentPolicy.value = userInfo.Policy;
  formModel.value.policy = JSON.stringify(userInfo.Policy);
};
getPolicie();
</script>

<style scoped></style>
