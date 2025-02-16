<template>
  <n-modal v-model:show="modalVisible" :mask-closable="false" preset="card" title="创建策略" class="max-w-screen-md" :segmented="{
    content: true,
    action: true,
  }">
    <n-card>
      <n-form label-placement="top" :model="formModel" label-align="left" :label-width="100">
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-grid-item :span="24" label="策略名称" path="name">
            <n-input v-model:value="formModel.name" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="策略原文" path="policy">
            <json-editor v-model="formModel.policy" v-bind="{
              /* 局部 props & attrs */
            }" />
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

<script setup lang="ts">
import stripJsonComments from 'strip-json-comments'
import { computed, ref } from 'vue'

interface Props {
  visible: boolean;
}
const { visible } = defineProps<Props>();
const message = useMessage();
const { $api } = useNuxtApp();

const defaultFormModal = {
  name: '',
  policy: '',
};
const formModel = ref({ ...defaultFormModal });

const emit = defineEmits<Emits>();
interface Emits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'search'): void;
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
}

async function submitForm() {
  try {
    const res = await $api.post('/add-canned-policy', {
      name: formModel.value.name,
      policy: stripJsonComments(formModel.value.policy),
    });

    message.success('添加成功');
    closeModal();
    emit('search');
  } catch (error) {
    message.error('添加失败');
  }
}
</script>

<style scoped></style>
