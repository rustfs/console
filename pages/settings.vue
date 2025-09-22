<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { configManager } from '~/utils/config';

const { t } = useI18n();
const message = useMessage();

// 当前配置信息
const currentConfig = ref({
  serverHost: '',
  api: {
    baseURL: '',
  },
  s3: {
    endpoint: '',
    region: '',
  },
});

// 表单数据
const formData = ref({
  serverHost: '',
});

const loading = ref(false);

// 加载当前配置
const loadCurrentConfig = async () => {
  try {
    const config = await configManager.loadConfig();
    currentConfig.value = config;
    formData.value.serverHost = config.serverHost;
  } catch (error) {
    message.error(t('Failed to load current configuration'));
  }
};

// 保存配置
const saveConfig = async () => {
  if (!formData.value.serverHost) {
    message.error(t('Please enter server address'));
    return;
  }

  loading.value = true;
  try {
    // 更宽松的URL验证
    let urlToValidate = formData.value.serverHost.trim();

    // 如果没有协议，自动添加https://
    if (!urlToValidate.match(/^https?:\/\//)) {
      urlToValidate = 'https://' + urlToValidate;
    }

    // 验证URL格式
    const url = new URL(urlToValidate);

    // 保存原始输入（如果用户没输入协议，就保存添加了协议的版本）
    const urlToSave = formData.value.serverHost.match(/^https?:\/\//) ? formData.value.serverHost : urlToValidate;
    localStorage.setItem('rustfs-server-host', urlToSave);

    // 如果我们自动添加了协议，更新输入框显示
    if (!formData.value.serverHost.match(/^https?:\/\//)) {
      formData.value.serverHost = urlToValidate;
    }

    // 清除配置缓存
    configManager.clearCache();

    message.success(t('Configuration saved successfully'));

    // 延迟后刷新页面，确保配置完全生效
    setTimeout(() => {
      window.location.reload();
    }, 200);
  } catch (error) {
    message.error(t('Invalid server address format'));
  } finally {
    loading.value = false;
  }
};

// 重置配置
const resetConfig = async () => {
  localStorage.removeItem('rustfs-server-host');
  configManager.clearCache();

  message.success(t('Configuration reset successfully'));

  // 延迟后刷新页面，确保配置完全生效
  setTimeout(() => {
    window.location.reload();
  }, 200);
};

onMounted(() => {
  loadCurrentConfig();
});
</script>

<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Settings') }}</h1>
      </template>
    </page-header>

    <page-content>
      <!-- 当前配置显示 -->
      <n-card :title="t('Current Configuration')" class="mb-6">
        <n-descriptions :columns="1" :bordered="true">
          <n-descriptions-item :label="t('Server Host')">
            {{ currentConfig.serverHost || t('Not configured') }}
          </n-descriptions-item>
          <n-descriptions-item :label="t('API Base URL')">
            {{ currentConfig.api.baseURL || t('Not configured') }}
          </n-descriptions-item>
          <n-descriptions-item :label="t('S3 Endpoint')">
            {{ currentConfig.s3.endpoint || t('Not configured') }}
          </n-descriptions-item>
          <n-descriptions-item :label="t('S3 Region')">
            {{ currentConfig.s3.region || t('Not configured') }}
          </n-descriptions-item>
        </n-descriptions>
      </n-card>

      <!-- 配置表单 -->
      <n-card :title="t('Server Configuration')">
        <n-form @submit.prevent="saveConfig">
          <n-form-item :label="t('Server Address')" required>
            <n-input
              v-model:value="formData.serverHost"
              :placeholder="t('Please enter server address (e.g., http://localhost:9000)')"
              clearable
            />
            <template #feedback>
              <div class="text-xs text-gray-500">
                {{ t('Example: http://localhost:9000 or https://your-domain.com') }}
              </div>
            </template>
          </n-form-item>

          <n-form-item>
            <n-space>
              <n-button type="primary" @click="saveConfig" :loading="loading">
                {{ t('Save Configuration') }}
              </n-button>

              <n-button @click="resetConfig">
                {{ t('Reset to Default') }}
              </n-button>
            </n-space>
          </n-form-item>
        </n-form>

        <n-alert type="info" :title="t('Configuration Information')" class="mt-4">
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>{{ t('Configuration is saved locally in your browser') }}</li>
            <li>{{ t('Page will refresh automatically after saving configuration') }}</li>
            <li>{{ t('Make sure the server address is accessible from your network') }}</li>
          </ul>
        </n-alert>
      </n-card>
    </page-content>
  </div>
</template>
