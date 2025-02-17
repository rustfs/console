<script setup lang="ts">
import { ref } from 'vue'
const { $api } = useNuxtApp();
const message = useMessage();
const emit = defineEmits<Emits>();

const visible = ref(false);

const defaultFormModal = {
  name: '',
  policy: '{}',
};
const formModel = ref({ ...defaultFormModal });

async function openDialog(row: any) {
  formModel.value.name = row.name;
  formModel.value.policy = JSON.parse(row.policy);
  visible.value = true;
}

defineExpose({ openDialog });

interface Emits {
  (e: 'saved'): void;
}

function closeModal() {
  visible.value = false;
}

async function submitForm() {
  try {
    const res = await $api.put(`/add-canned-policy?name=${formModel.value.name}`, JSON.parse(formModel.value.policy));
    message.success('修改成功');
    closeModal();
    emit('saved');
  } catch (error) {
    message.error('修改失败');
  }
}
</script>

<template>
  <n-modal v-model:show="visible" :mask-closable="false" preset="card" title="策略原文" class="max-w-screen-md" :segmented="{
    content: true,
    action: true,
  }">
    <n-form label-placement="top" :model="formModel" label-align="left" :label-width="100">
      <n-grid :cols="24" :x-gap="18">
        <n-form-item-grid-item :span="24" path="policy">
          <json-editor v-model="formModel.policy" />
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
