<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { $api } = useNuxtApp();
const message = useMessage();

interface PolicyItem {
  name: string
  content: string | object
}

const emit = defineEmits(['update:show', 'saved']);

const props = defineProps<{
  show: boolean
  policy: PolicyItem | null | undefined
}>();

const name = ref(props.policy?.name || '');
const content = ref(
  typeof props.policy?.content === 'object'
    ? JSON.stringify(props.policy?.content, null, 2)
    : (props.policy?.content || '')
);

watch(
  () => props.policy,
  (newPolicy) => {
    if (newPolicy) {
      name.value = newPolicy.name || '';
      content.value =
        typeof newPolicy.content === 'object'
          ? JSON.stringify(newPolicy.content, null, 2)
          : (newPolicy.content || '');
    }
  },
  { immediate: true }
);

const closeModal = () => emit('update:show', false)

async function submitForm() {
  try {
    const res = await $api.put(`/add-canned-policy?name=${name.value}`, JSON.parse(content.value || '{}'));
    message.success(t('Saved'));
    closeModal();
    emit('saved');
  } catch (error) {
    message.error(t('Save Failed'));
    console.error('Error:', error);
  }
}
</script>

<template>
  <n-modal :show="show" @update:show="(val: boolean) => $emit('update:show', val)" :mask-closable="false" preset="card" :title="t('Policy Original')" class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-form label-placement="top" label-align="left" :label-width="100">
      <n-grid :cols="24" :x-gap="18">
        <n-form-item-grid-item :span="24" :label="t('Policy Name')" path="name">
          <n-input v-model:value="name" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="24" :label="t('Policy Original')" path="content">
          <n-scrollbar class="w-full max-h-[60vh] "> <json-editor v-model="content" /></n-scrollbar>
        </n-form-item-grid-item>
      </n-grid>
    </n-form>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">{{ t('Cancel') }}</n-button>
        <n-button type="primary" @click="submitForm">{{ t('Submit') }}</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
