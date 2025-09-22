<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    :title="t('Add Site Replication')"
    class="max-w-screen-lg"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-card :title="t('Add Replication Site')">
      <p>
        {{ t('Note: AccessKey and SecretKey values are required for each site when adding or editing peer sites') }}
      </p>
      <n-form ref="currentFormRef" :model="currentSite" :rules="rules">
        <!-- 当前站点 -->
        <n-flex style="margin-top: 16px">
          <n-card :title="t('Current Site')">
            <n-space direction="vertical">
              <n-form-item :label="t('Site Name')" path="name">
                <n-input v-model:value="currentSite.name" :placeholder="t('Site Name')" />
              </n-form-item>
              <n-form-item :label="t('Endpoint *')" path="endpoint">
                <n-input v-model:value="currentSite.endpoint" :placeholder="t('Endpoint')" />
              </n-form-item>
              <n-form-item :label="t('Access Key *')" path="accessKey">
                <n-input v-model:value="currentSite.accessKey" :placeholder="t('Access Key')" />
              </n-form-item>
              <n-form-item :label="t('Secret Key *')" path="secretKey">
                <n-input type="password" v-model:value="currentSite.secretKey" :placeholder="t('Secret Key')" />
              </n-form-item>
            </n-space>
          </n-card>
        </n-flex>

        <!-- 远程站点 -->
        <n-flex direction="vertical" style="margin-top: 16px">
          <n-card :title="t('Remote Site')">
            <n-space direction="vertical">
              <n-dynamic-input :min="1" v-model:value="remoteSite" :on-create="onCreate">
                <template #default="{ value }">
                  <n-grid x-gap="12" :cols="4">
                    <n-gi>
                      <n-form-item :label="t('Site Name')" path="name">
                        <n-input v-model:value="value.name" :placeholder="t('Site Name')" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item :label="t('Endpoint *')" path="endpoint">
                        <n-input v-model:value="value.endpoint" :placeholder="t('Endpoint')" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item :label="t('Access Key *')" path="accessKey">
                        <n-input v-model:value="value.accessKey" :placeholder="t('Access Key')" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item :label="t('Secret Key *')" path="secretKey">
                        <n-input type="password" v-model:value="value.secretKey" :placeholder="t('Secret Key')" />
                      </n-form-item>
                    </n-gi>
                  </n-grid>
                </template>
              </n-dynamic-input>
            </n-space>
          </n-card>
        </n-flex>
      </n-form>
      <!-- 按钮 -->
      <n-space justify="center" style="margin-top: 16px">
        <n-button type="primary" @click="save">{{ t('Save') }}</n-button>
        <n-button @click="cancel">{{ t('Cancel') }}</n-button>
      </n-space>
    </n-card>
  </n-modal>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const currentSite = ref({
  name: '',
  endpoint: 'http://127.0.0.1:7000',
  accessKey: 'rusyfsadmin',
  secretKey: '',
});

const remoteSite = ref([
  {
    name: '',
    endpoint: '',
    accessKey: '',
    secretKey: '',
  },
]);

const onCreate = () => {
  return {
    name: '',
    endpoint: '',
    accessKey: '',
    secretKey: '',
  };
};

const rules = {
  endpoint: [{ required: true, message: t('Endpoint is required'), trigger: 'blur' }],
  accessKey: [{ required: true, message: t('Access Key is required'), trigger: 'blur' }],
  secretKey: [{ required: true, message: t('Secret Key is required'), trigger: 'blur' }],
};

const currentFormRef = ref(null);
const save = () => {
  // Save logic here
  console.log('Current Site:', currentSite.value);
  console.log('Remote Site:', remoteSite.value);
};

const cancel = () => {
  // Cancel logic here
};

const visible = ref(false);
const open = () => {
  visible.value = true;
};

defineExpose({
  open,
});
</script>

<style scoped>
:deep(.n-dynamic-input-item__action) {
  align-self: center !important;
}
</style>
