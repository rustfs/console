<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Server-Side Encryption (SSE) Configuration') }}</h1>
      </template>
      <template #description>
        <p class="text-gray-600 dark:text-gray-400">
          {{ t('Configure server-side encryption for your objects using external key management services.') }}
        </p>
      </template>
    </page-header>

    <page-content>
      <!-- KMS 状态显示 -->
      <n-card :title="t('KMS Status')" class="mb-6">
        <div class="flex items-center space-x-4">
          <n-tag :type="getKmsStatusType()" size="large">
            {{ getKmsStatusText() }}
          </n-tag>
          <div class="text-sm text-gray-500">
            {{ getKmsStatusDescription() }}
          </div>
          <div v-if="sseKmsForm.kms_backend" class="text-sm text-gray-400">
            {{ t('Backend') }}: {{ sseKmsForm.kms_backend }}
          </div>
        </div>
      </n-card>

      <!-- KMS 配置区域 -->
      <n-card :title="t('KMS Configuration')" class="mb-6">
        <div v-if="!isEditing" class="space-y-4">
          <!-- 当前配置显示 -->
          <div v-if="sseKmsForm.kms_type" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div class="flex justify-between items-start">
              <div class="space-y-2">
                <div class="font-medium">{{ t('Current KMS Type') }}: {{ getKmsTypeName(sseKmsForm.kms_type) }}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  <div>{{ t('Vault Server') }}: {{ sseKmsForm.vault_address }}</div>
                  <div v-if="sseKmsForm.vault_mount_path">{{ t('Mount Path') }}: {{ sseKmsForm.vault_mount_path }}</div>
                  <div v-if="sseKmsForm.default_key_id">{{ t('Default Key ID') }}: {{ sseKmsForm.default_key_id }}</div>
                </div>
              </div>
              <n-button @click="startEditing" size="small">
                {{ t('Edit Configuration') }}
              </n-button>
            </div>
          </div>

          <!-- 未配置状态 -->
          <div v-else class="text-center py-8 text-gray-500">
            <Icon name="ri:key-2-line" class="text-4xl mx-auto mb-2" />
            <div>{{ t('No KMS configuration found') }}</div>
            <n-button @click="startEditing" class="mt-2">
              {{ t('Configure KMS') }}
            </n-button>
          </div>
        </div>

        <!-- 编辑模式表单 -->
        <div v-else>
          <n-form
            ref="sseKmsFormRef"
            :model="sseKmsForm"
            :rules="sseKmsRules"
            label-placement="left"
            :label-width="150"
          >
            <!-- KMS 类型显示 -->
            <n-form-item :label="t('KMS Type')" path="kms_type">
              <div class="text-gray-700 dark:text-gray-300">
                {{ t('HashiCorp Vault Transit Engine') }}
              </div>
            </n-form-item>

            <!-- HashiCorp Vault 配置 -->
            <div v-if="sseKmsForm.kms_type === 'vault'">
              <n-form-item :label="t('Vault Server Address')" path="vault_address" required>
                <n-input v-model:value="sseKmsForm.vault_address" :placeholder="t('e.g., https://vault.example.com')" />
              </n-form-item>

              <n-form-item :label="t('Vault Token')" path="vault_token">
                <n-input
                  v-model:value="sseKmsForm.vault_token"
                  type="password"
                  show-password-on="mousedown"
                  :placeholder="t('Enter your Vault authentication token')"
                />
                <template #feedback>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ t('Optional: Use Token authentication') }}
                  </div>
                </template>
              </n-form-item>

              <n-form-item :label="t('AppRole ID')" path="vault_app_role_id" class="mt-2">
                <n-input v-model:value="sseKmsForm.vault_app_role_id" :placeholder="t('Enter AppRole ID')" />
                <template #feedback>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ t('Optional: Use AppRole authentication with Secret ID') }}
                  </div>
                </template>
              </n-form-item>

              <n-form-item :label="t('AppRole Secret ID')" path="vault_app_role_secret_id" class="mt-2">
                <n-input
                  v-model:value="sseKmsForm.vault_app_role_secret_id"
                  type="password"
                  show-password-on="mousedown"
                  :placeholder="t('Enter AppRole Secret ID')"
                />
              </n-form-item>

              <n-form-item :label="t('Vault Namespace')" path="vault_namespace" class="mt-2">
                <n-input
                  v-model:value="sseKmsForm.vault_namespace"
                  :placeholder="t('Leave empty for root namespace')"
                />
                <template #feedback>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ t('Optional: Vault Enterprise namespace') }}
                  </div>
                </template>
              </n-form-item>

              <n-form-item :label="t('Mount Path')" path="vault_mount_path" class="mt-2">
                <n-input v-model:value="sseKmsForm.vault_mount_path" :placeholder="t('transit')" />
                <template #feedback>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ t('Transit engine mount name, default: transit') }}
                  </div>
                </template>
              </n-form-item>

              <n-form-item :label="t('Timeout (seconds)')" path="vault_timeout_seconds" class="mt-2">
                <n-input v-model:value="sseKmsForm.vault_timeout_seconds" :min="1" :max="300" placeholder="30" />
                <template #feedback>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ t('Request timeout in seconds, default: 30') }}
                  </div>
                </template>
              </n-form-item>
            </div>

            <!-- 默认密钥ID -->
            <n-form-item :label="t('Default Key ID')" path="default_key_id" class="mt-2">
              <n-input v-model:value="sseKmsForm.default_key_id" :placeholder="t('rustfs-default-key')" />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Default master key ID for SSE-KMS, fallback: rustfs-default-key') }}
                </div>
              </template>
            </n-form-item>

            <!-- 操作按钮 -->
            <n-form-item class="flex justify-end">
              <div class="flex space-x-2">
                <n-button @click="cancelEditing">
                  {{ t('Cancel') }}
                </n-button>
                <n-button type="primary" @click="saveConfiguration" :loading="saving">
                  {{ t('Save Configuration') }}
                </n-button>
              </div>
            </n-form-item>
          </n-form>
        </div>
      </n-card>

      <!-- KMS 密钥列表 -->
      <n-card :title="t('KMS Keys Management')" class="mb-6">
        <div class="space-y-4">
          <!-- 操作按钮 -->
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-500">{{ t('Total Keys') }}: {{ kmsKeys.length }}</div>
            <n-button
              type="primary"
              @click="showCreateKeyModal = true"
              :disabled="!canAddKeys"
              :title="!canAddKeys ? t('KMS not available for key operations') : ''"
            >
              <template #icon>
                <Icon name="ri:add-line" />
              </template>
              {{ t('Create New Key') }}
            </n-button>
          </div>

          <!-- 密钥列表 -->
          <div v-if="kmsKeys.length > 0" class="space-y-3">
            <div v-for="key in kmsKeys" :key="key.keyId" class="border rounded-lg p-4">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="font-medium">{{ key.keyName }}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>{{ t('Key ID') }}: {{ key.keyId }}</div>
                    <div>{{ t('Algorithm') }}: {{ key.algorithm }}</div>
                    <div>
                      {{ t('Status') }}:
                      <n-tag :type="getKeyStatusType(key.status)" size="small">
                        {{ getKeyStatusText(key.status) }}
                      </n-tag>
                    </div>
                    <div>{{ t('Created') }}: {{ formatDate(new Date(key.createdAt)) }}</div>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <n-button
                    size="small"
                    @click="toggleKeyStatus(key)"
                    :disabled="key.status === 'PendingDeletion'"
                    :title="key.status === 'PendingDeletion' ? t('Cannot modify status while pending deletion') : ''"
                  >
                    {{ key.status === 'Active' ? t('Deactivate') : t('Activate') }}
                  </n-button>
                  <n-button
                    size="small"
                    type="error"
                    @click="deleteKeyClick(key)"
                    :disabled="key.status === 'PendingDeletion'"
                    :title="key.status === 'PendingDeletion' ? t('Already pending deletion') : ''"
                  >
                    {{ key.status === 'PendingDeletion' ? t('Deleting...') : t('Delete') }}
                  </n-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="text-center py-8 text-gray-500">
            <Icon name="ri:key-2-line" class="text-4xl mx-auto mb-2" />
            <div>{{ t('No KMS keys found') }}</div>
            <div class="text-sm">{{ t('Create your first KMS key to get started') }}</div>
            <n-button
              @click="showCreateKeyModal = true"
              class="mt-2"
              :disabled="!canAddKeys"
              :title="!canAddKeys ? t('KMS not available for key operations') : ''"
            >
              {{ t('Create First Key') }}
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- 创建/编辑密钥模态框 -->
      <n-modal v-model:show="showCreateKeyModal" :mask-closable="false">
        <n-card
          :title="t('Create New Key')"
          class="max-w-screen-md"
          :bordered="false"
          size="medium"
          role="dialog"
          aria-modal="true"
        >
          <n-form ref="keyFormRef" :model="keyForm" :rules="keyFormRules" label-placement="left" :label-width="120">
            <n-form-item :label="t('Key Name')" path="keyName" required>
              <n-input v-model:value="keyForm.keyName" :placeholder="t('e.g., app-default')" />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Main key ID (Transit key name). Use business-related readable ID.') }}
                </div>
              </template>
            </n-form-item>

            <n-form-item :label="t('Algorithm')" path="algorithm">
              <n-select
                v-model:value="keyForm.algorithm"
                :options="algorithmOptions"
                :placeholder="t('Select encryption algorithm')"
              />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Encryption algorithm for the key.') }}
                </div>
              </template>
            </n-form-item>
          </n-form>

          <template #footer>
            <div class="flex justify-end space-x-2">
              <n-button @click="showCreateKeyModal = false">
                {{ t('Cancel') }}
              </n-button>
              <n-button type="primary" @click="saveKey" :loading="savingKey">
                {{ t('Create Key') }}
              </n-button>
            </div>
          </template>
        </n-card>
      </n-modal>

      <!-- 删除确认模态框 -->
      <n-modal v-model:show="showDeleteModal" :mask-closable="false">
        <n-card
          :title="t('Confirm Delete')"
          class="max-w-screen-md"
          :bordered="false"
          size="huge"
          role="dialog"
          aria-modal="true"
        >
          <div class="text-center py-4">
            <Icon name="ri:alert-line" class="text-4xl text-red-500 mx-auto mb-2" />
            <div class="text-lg font-medium mb-2">
              {{ t('Are you sure you want to delete this key?') }}
            </div>
            <div class="text-gray-500">
              {{ t('This action cannot be undone.') }}
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end space-x-2">
              <n-button @click="showDeleteModal = false">
                {{ t('Cancel') }}
              </n-button>
              <n-button type="error" @click="confirmDeleteKey" :loading="deletingKey">
                {{ t('Delete Key') }}
              </n-button>
            </div>
          </template>
        </n-card>
      </n-modal>
    </page-content>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
const { getKMSStatus, getConfiguration, configureKMS, createKey, enableKey, disableKey, getKeyList, deleteKey } =
  useSSE();

const { t } = useI18n();
const message = useMessage();

// 状态管理
const isEditing = ref(false);
const saving = ref(false);
const testingConnection = ref(false);

// 密钥管理状态
const showCreateKeyModal = ref(false);
const showDeleteModal = ref(false);
const savingKey = ref(false);
const deletingKey = ref(false);
const keyToDelete = ref<any>(null);

// SSE-KMS 表单数据
const sseKmsForm = reactive({
  kms_type: 'vault',
  vault_address: '',
  vault_token: '',
  vault_app_role_id: '',
  vault_app_role_secret_id: '',
  vault_namespace: '',
  vault_mount_path: 'transit',
  vault_timeout_seconds: '30',
  default_key_id: '',
  kms_status: '', // KMS状态：OK, Degraded, Failed
  kms_backend: '', // KMS后端信息
  kms_healthy: false, // KMS健康状态
});

// KMS 密钥列表
const kmsKeys = ref<any[]>([]);

// 密钥表单数据
const keyForm = reactive({
  keyName: '',
  algorithm: 'AES-256',
});

// 算法选项
const algorithmOptions = [
  { label: 'AES-256', value: 'AES-256' },
  { label: 'AES-128', value: 'AES-128' },
  { label: 'RSA-2048', value: 'RSA-2048' },
  { label: 'RSA-4096', value: 'RSA-4096' },
];

// 表单引用
const sseKmsFormRef = ref();

// 密钥表单引用
const keyFormRef = ref();

// KMS表单验证规则
const sseKmsRules = {
  kms_type: {
    required: true,
    message: t('Please select KMS type'),
    trigger: 'change',
  },
  vault_address: {
    required: true,
    message: t('Please enter Vault server address'),
    trigger: 'blur',
    validator: (rule: any, value: string) => {
      if (sseKmsForm.kms_type === 'vault' && !value) {
        return new Error(t('Please enter Vault server address'));
      }
      return true;
    },
  },
};

// 密钥表单验证规则
const keyFormRules = {
  keyName: {
    required: true,
    message: t('Please enter key name'),
    trigger: 'blur',
  },
};

// 计算属性
const hasConfiguration = computed(() => {
  if (sseKmsForm.kms_type === 'local') {
    return true;
  }
  // 如果是Vault KMS，需要同时有kms_type和vault_address
  return sseKmsForm.kms_type === 'vault' && sseKmsForm.vault_address;
});

// 计算属性：是否可以添加密钥
const canAddKeys = computed(() => {
  // 只有在配置完成且状态不是Failed时才允许添加密钥
  // OK和Degraded状态都允许添加密钥（Degraded表示已配置但功能受限）
  return hasConfiguration.value && sseKmsForm.kms_status !== 'Failed';
});

// 方法
const getKmsStatusType = () => {
  if (!hasConfiguration.value) return 'default';

  // 根据KMS状态返回不同的标签类型
  switch (sseKmsForm.kms_status) {
    case 'OK':
      return 'success';
    case 'Degraded':
      return 'warning';
    case 'Failed':
      return 'error';
    default:
      return 'default';
  }
};

const getKmsStatusText = () => {
  if (!hasConfiguration.value) return t('Not Configured');

  // 根据KMS状态返回不同的状态文本
  switch (sseKmsForm.kms_status) {
    case 'OK':
      return t('Available');
    case 'Degraded':
      return t('Degraded');
    case 'Failed':
      return t('Failed');
    default:
      return t('Unknown');
  }
};

const getKmsStatusDescription = () => {
  if (!hasConfiguration.value) return t('KMS server is not configured');

  // 根据KMS状态返回不同的描述
  switch (sseKmsForm.kms_status) {
    case 'OK':
      return t('KMS server is available and ready for use');
    case 'Degraded':
      return t('KMS server is reachable but encryption/decryption path not fully verified');
    case 'Failed':
      return t('KMS server is not reachable');
    default:
      return t('KMS server status unknown');
  }
};

// 获取密钥状态标签类型
const getKeyStatusType = (status: string) => {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Inactive':
      return 'default';
    case 'PendingDeletion':
      return 'warning';
    default:
      return 'default';
  }
};

// 获取密钥状态显示文本
const getKeyStatusText = (status: string) => {
  switch (status) {
    case 'Active':
      return t('Active');
    case 'Inactive':
      return t('Inactive');
    case 'PendingDeletion':
      return t('Pending Deletion');
    case 'Disabled':
      return t('Disabled');
    default:
      return status;
  }
};

const getKmsTypeName = (kmsType: string) => {
  const names: Record<string, string> = {
    vault: t('HashiCorp Vault Transit Engine'),
  };
  return names[kmsType] || kmsType;
};

const toggleKeyStatus = async (key: any) => {
  try {
    // 不允许修改PendingDeletion状态的密钥
    if (key.status === 'PendingDeletion') {
      message.warning(t('Cannot modify status while pending deletion'));
      return;
    }

    if (key.status === 'Active') {
      await disableKey(key.keyId);
      key.status = 'Inactive';
    } else {
      await enableKey(key.keyId);
      key.status = 'Active';
    }
    message.success(t('Key status updated successfully'));
  } catch (error) {
    message.error(t('Failed to update key status'));
  }
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// KMS配置编辑方法
const startEditing = () => {
  // 如果是首次编辑，默认选中Vault
  if (!sseKmsForm.kms_type) {
    sseKmsForm.kms_type = 'vault';
  }
  isEditing.value = true;
};

const cancelEditing = () => {
  isEditing.value = false;
  // 重置表单到当前配置
  loadKMSStatus();
};

// 统一的KMS状态和配置获取方法
const loadKMSStatus = async () => {
  try {
    // 获取KMS状态
    const statusResponse = await getKMSStatus();
    if (statusResponse && statusResponse.code === 'KMSNotConfigured') {
      // KMS未配置，直接进入编辑模式
      isEditing.value = true;
      message.info(t('KMS is not configured, please configure it first'));
      return;
    }

    if (statusResponse && statusResponse.code !== 'KMSNotConfigured') {
      // 获取配置详情
      const configResponse = await getConfiguration();
      if (configResponse) {
        // 更新表单数据
        Object.assign(sseKmsForm, {
          kms_type: configResponse.kms_type?.toLowerCase() || 'vault',
          vault_address: configResponse.backend?.address || '',
          vault_token: configResponse.backend?.auth_method === 'token' ? '***' : '',
          vault_app_role_id: configResponse.backend?.auth_method === 'approle' ? '***' : '',
          vault_app_role_secret_id: configResponse.backend?.auth_method === 'approle' ? '***' : '',
          vault_namespace: configResponse.backend?.namespace || '',
          vault_mount_path: configResponse.backend?.mount_path || 'transit',
          vault_timeout_seconds: configResponse.timeout_secs?.toString() || '30',
          default_key_id: configResponse.default_key_id || '',
        });

        // 设置KMS状态信息
        if (statusResponse.status) {
          sseKmsForm.kms_status = statusResponse.status;
          sseKmsForm.kms_backend = statusResponse.backend;
          sseKmsForm.kms_healthy = statusResponse.healthy;
        }

        message.success(t('Configuration loaded successfully'));
      }
    }
  } catch (error) {
    console.error('Failed to load KMS status:', error);
    // 如果API调用失败，也进入编辑模式
    isEditing.value = true;
    message.error(t('Failed to load configuration'));
  }
};

// 加载密钥列表
const loadKeyList = async () => {
  try {
    const keys = await getKeyList();
    kmsKeys.value = keys.keys || [];
  } catch (error) {
    message.error(t('Failed to load key list'));
  }
};
// 设置为本地开发
const setLocalDevelopment = async () => {
  try {
    await configureKMS({
      kms_type: 'Local',
      default_key_id: null,
      timeout_secs: 30,
      retry_attempts: 3,
      enable_audit: true,
      audit_log_path: null,
      backend: {
        type: 'local',
        address: null,
        namespace: null,
        mount_path: null,
        auth_method: null,
      },
    });

    message.success(t('Local development mode set successfully'));

    // 重新加载配置
    await loadKMSStatus();
  } catch (error) {
    message.error(t('Failed to set local development mode'));
  }
};
// setLocalDevelopment();

const saveConfiguration = async () => {
  try {
    saving.value = true;

    // 验证表单
    await sseKmsFormRef.value?.validate();

    // 调用API保存KMS配置
    await configureKMS({
      kms_type: sseKmsForm.kms_type.charAt(0).toUpperCase() + sseKmsForm.kms_type.slice(1), // 首字母大写
      default_key_id: sseKmsForm.default_key_id || null,
      timeout_secs: parseInt(sseKmsForm.vault_timeout_seconds) || 30,
      retry_attempts: 3, // 默认值
      enable_audit: true, // 默认值
      audit_log_path: null, // 默认值
      backend: {
        type: sseKmsForm.kms_type,
        address: sseKmsForm.vault_address,
        namespace: sseKmsForm.vault_namespace || null,
        mount_path: sseKmsForm.vault_mount_path,
        auth_method: sseKmsForm.vault_token ? 'token' : 'approle',
        // 注意：这里不传递敏感信息如token和secret_id
      },
    });

    message.success(t('Configuration saved successfully'));
    isEditing.value = false;
  } catch (error) {
    message.error(t('Failed to save configuration'));
  } finally {
    saving.value = false;
  }
};

const deleteKeyClick = (key: any) => {
  // 如果密钥已经在删除中，显示提示
  if (key.status === 'PendingDeletion') {
    message.info(t('Key is already pending deletion'));
    return;
  }

  keyToDelete.value = key;
  showDeleteModal.value = true;
};

const saveKey = async () => {
  try {
    savingKey.value = true;

    // 验证表单
    await keyFormRef.value?.validate();

    // 调用API创建密钥
    await createKey({
      keyName: keyForm.keyName,
      algorithm: keyForm.algorithm,
    });

    message.success(t('Key created successfully'));
    showCreateKeyModal.value = false;

    // 重置表单
    Object.assign(keyForm, {
      keyName: '',
      algorithm: 'AES-256',
    });

    // 重新加载密钥列表
    await loadKeyList();
  } catch (error) {
    message.error(t('Failed to save key'));
  } finally {
    savingKey.value = false;
  }
};

const confirmDeleteKey = async () => {
  try {
    deletingKey.value = true;

    // 调用API删除密钥
    await deleteKey(keyToDelete.value.keyId);
    message.success(t('Key deleted successfully'));

    showDeleteModal.value = false;
    keyToDelete.value = null;

    // 重新加载密钥列表
    await loadKeyList();
  } catch (error) {
    message.error(t('Failed to delete key'));
  } finally {
    deletingKey.value = false;
  }
};

// 页面加载时获取当前配置和密钥列表
onMounted(async () => {
  await loadKMSStatus();
  await loadKeyList();
});
</script>

<style scoped>
.sticky {
  position: sticky;
}
</style>
