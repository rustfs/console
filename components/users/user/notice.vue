<template>
  <div>
    <n-modal
      v-model:show="visible"
      :mask-closable="false"
      preset="card"
      :title="t('New user has been created')"
      class="max-w-screen-md"
      :segmented="{
        content: true,
        action: true,
      }"
    >
      <n-card>
        <n-form label-placement="left" label-align="right" :label-width="130">
          <n-grid :cols="24" :x-gap="18">
            <n-form-item-grid-item :span="24" label="Access Key">
              <copy-input class="w-full" v-model="accessKey" :readonly="true" :copy-icon="true"></copy-input>
            </n-form-item-grid-item>
            <n-form-item-grid-item :span="24" label="secretkey">
              <copy-input class="w-full" v-model="secretkey" :readonly="true" :copy-icon="true"></copy-input>
            </n-form-item-grid-item>
          </n-grid>
        </n-form>
      </n-card>
      <template #action>
        <n-space justify="center">
          <n-button @click="closeModal()">{{ t('Cancel') }}</n-button>
          <n-button type="primary" @click="exportFile">{{ t('Export') }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { download } from '@/utils/export-file';
const visible = ref(false);
const { t } = useI18n();

const accessKey = ref('');
const secretkey = ref('');
const url = ref('');
function openDialog(data: any) {
  accessKey.value = data.credentials.accessKey;
  secretkey.value = data.credentials.secretKey;
  url.value = data.url;
  visible.value = true;
}
const emit = defineEmits(['search']);
function closeModal() {
  visible.value = false;
  accessKey.value = '';
  secretkey.value = '';
  emit('search');
}

defineExpose({
  openDialog,
});

function exportFile() {
  download(
    'credentials.json',
    JSON.stringify({
      url: url.value,
      accessKey: accessKey.value,
      secretKey: secretkey.value,
      api: 's3v4',
      path: 'auto',
    })
  );
}
</script>

<style lang="scss" scoped></style>
