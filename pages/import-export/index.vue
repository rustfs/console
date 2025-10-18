<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Import/Export') }}</h1>
      </template>
    </page-header>
    <page-content>
      <n-tabs type="card">
        <!-- IAM标签页 -->
        <n-tab-pane name="iam" :tab="t('IAM')">
          <div class="space-y-6">
            <!-- IAM导出功能 -->
            <n-card :title="t('IAM Configuration Export')" class="shadow-sm">
              <div class="space-y-4">
                <p class="text-gray-600 dark:text-gray-300">
                  {{ t('Export all IAM configurations including users, groups, policies, and access keys in a ZIP file.') }}
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex items-center space-x-2">
                    <Icon name="ri:user-line" class="text-blue-500" />
                    <span>{{ t('Users') }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Icon name="ri:group-line" class="text-green-500" />
                    <span>{{ t('User Groups') }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Icon name="ri:shield-line" class="text-purple-500" />
                    <span>{{ t('IAM Policies') }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Icon name="ri:key-line" class="text-orange-500" />
                    <span>{{ t('AK/SK') }}</span>
                  </div>
                </div>

                <n-alert type="info" :show-icon="false">
                  <template #icon>
                    <Icon name="ri:information-line" />
                  </template>
                  {{ t('The exported file contains sensitive information. Please keep it secure.') }}
                </n-alert>

                <!-- 导出操作区域 -->
                <div class="flex items-center justify-between pt-4 border-t">
                  <div>
                    <h4 class="font-medium">{{ t('Export IAM Configuration') }}</h4>
                    <p class="text-sm text-gray-500 mt-1">
                      {{ t('Download complete IAM configuration as ZIP file') }}
                    </p>
                  </div>
                  <n-button
                    type="primary"
                    size="large"
                    :loading="isLoading"
                    :disabled="isLoading"
                    @click="handleExportIam"
                  >
                    <template #icon>
                      <Icon name="ri:download-2-line" />
                    </template>
                    {{ isLoading ? t('Exporting...') : t('Export Now') }}
                  </n-button>
                </div>
              </div>
            </n-card>

            <!-- IAM导入功能 -->
            <n-card :title="t('IAM Configuration Import')" class="shadow-sm">
              <div class="space-y-4">
                <p class="text-gray-600 dark:text-gray-300">
                  {{ t('Import IAM configurations from a previously exported ZIP file.') }}
                </p>

                <!-- 文件上传区域 -->
                <div class="space-y-4">
                  <div>
                    <h4 class="font-medium mb-2">{{ t('Select ZIP File') }}</h4>
                    <n-upload
                      ref="uploadRef"
                      :max="1"
                      :file-list="fileList"
                      @update:file-list="handleFileListChange"
                      @before-upload="beforeUpload"
                      accept=".zip"
                      :disabled="isLoading"
                    >
                      <n-upload-dragger>
                        <div style="margin-bottom: 12px">
                          <Icon name="ri:upload-cloud-2-line" size="48" depth="3" />
                        </div>
                        <n-text style="font-size: 16px">
                          {{ t('Click or drag ZIP file to this area to upload') }}
                        </n-text>
                        <n-p depth="3" style="margin: 8px 0 0 0">
                          {{ t('Only ZIP files are supported, and file size should not exceed 10MB') }}
                        </n-p>
                      </n-upload-dragger>
                    </n-upload>
                  </div>

                  <!-- 导入操作区域 -->
                  <div class="flex items-center justify-between pt-4 border-t">
                    <div>
                      <h4 class="font-medium">{{ t('Import IAM Configuration') }}</h4>
                      <p class="text-sm text-gray-500 mt-1">
                        {{ selectedFile ? t('Ready to import: {filename}', { filename: selectedFile.name }) : t('Please select a ZIP file to import') }}
                      </p>
                    </div>
                    <n-button
                      type="primary"
                      size="large"
                      :loading="isLoading"
                      :disabled="isLoading || !selectedFile"
                      @click="handleImportIam"
                    >
                      <template #icon>
                        <Icon name="ri:upload-2-line" />
                      </template>
                      {{ isLoading ? t('Importing...') : t('Import Now') }}
                    </n-button>
                  </div>
                </div>
              </div>
            </n-card>
          </div>
        </n-tab-pane>

        <!-- 预留其他功能的标签页 -->
        <!-- <n-tab-pane name="bucket" :tab="t('Bucket')">
          <div class="text-center py-12">
            <Icon name="ri:box-3-line" size="48" depth="3" class="mx-auto mb-4 text-gray-400" />
            <h3 class="text-lg font-medium text-gray-600 mb-2">{{ t('Coming soon...') }}</h3>
            <p class="text-gray-500">{{ t('Bucket import/export features will be available soon.') }}</p>
          </div>
        </n-tab-pane>

        <n-tab-pane name="logs" :tab="t('Logs')">
          <div class="text-center py-12">
            <Icon name="ri:file-text-line" size="48" depth="3" class="mx-auto mb-4 text-gray-400" />
            <h3 class="text-lg font-medium text-gray-600 mb-2">{{ t('Coming soon...') }}</h3>
            <p class="text-gray-500">{{ t('Logs import/export features will be available soon.') }}</p>
          </div>
        </n-tab-pane> -->
      </n-tabs>
    </page-content>
  </div>
</template>

<script setup>
import { Icon } from '#components';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// SEO设置
definePageMeta({
  title: 'Import/Export',
});

// 使用导入导出功能composable
const { isLoading, exportIamConfig, importIamConfig } = useImportExport();

// 文件上传相关状态
const uploadRef = ref();
const fileList = ref([]);
const selectedFile = ref(null);

/**
 * 处理IAM导出
 */
const handleExportIam = async () => {
  try {
    await exportIamConfig();
  } catch (error) {
    // 错误已在composable中处理
    console.error('Export failed:', error);
  }
};

/**
 * 处理文件列表变化
 */
const handleFileListChange = (fileList) => {
  if (fileList && Array.isArray(fileList)) {
    fileList.value = fileList;
    selectedFile.value = fileList.length > 0 ? fileList[0].file : null;
  }
};

/**
 * 上传前的文件验证
 */
const beforeUpload = (data) => {
  const file = data.file || data;

  // 检查文件类型
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return false;
  }

  // 检查文件大小 (10MB)
  const fileSize = file.file?.size || file.size || 0;
  if (fileSize > 10 * 1024 * 1024) {
    return false;
  }

  return true;
};

/**
 * 处理IAM导入
 */
const handleImportIam = async () => {
  if (!selectedFile.value) {
    return;
  }

  try {
    await importIamConfig(selectedFile.value);
    // 导入成功后清空文件选择
    fileList.value = [];
    selectedFile.value = null;
    if (uploadRef.value) {
      uploadRef.value.clear();
    }
  } catch (error) {
    // 错误已在composable中处理
    console.error('Import failed:', error);
  }
};
</script>
