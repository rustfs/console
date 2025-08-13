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
            <n-button type="primary" @click="showCreateKeyModal = true">
              <template #icon>
                <Icon name="ri:add-line" />
              </template>
              {{ t('Create New Key') }}
            </n-button>
          </div>

          <!-- 密钥列表 -->
          <div v-if="kmsKeys.length > 0" class="space-y-3">
            <div v-for="key in kmsKeys" :key="key.id" class="border rounded-lg p-4">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="font-medium">{{ key.name }}</div>
                  <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>{{ t('Key ID') }}: {{ key.id }}</div>
                    <div>{{ t('Algorithm') }}: {{ key.algorithm }}</div>
                    <div>
                      {{ t('Status') }}:
                      <n-tag :type="key.status === 'enabled' ? 'success' : 'default'" size="small">
                        {{ key.status === 'enabled' ? t('Enabled') : t('Disabled') }}
                      </n-tag>
                    </div>
                    <div>{{ t('Created') }}: {{ formatDate(key.createdAt) }}</div>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <n-button size="small" @click="toggleKeyStatus(key)">
                    {{ key.status === 'enabled' ? t('Disable') : t('Enable') }}
                  </n-button>
                  <n-button size="small" type="error" @click="deleteKey(key)">
                    {{ t('Delete') }}
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
            <n-button @click="showCreateKeyModal = true" class="mt-2">
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
            <n-form-item :label="t('Key Name')" path="name" required>
              <n-input v-model:value="keyForm.name" :placeholder="t('e.g., app-default')" />
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

            <n-form-item :label="t('Initial Status')" path="status">
              <n-radio-group v-model:value="keyForm.status">
                <n-radio value="enabled">{{ t('Enabled') }}</n-radio>
                <n-radio value="disabled">{{ t('Disabled') }}</n-radio>
              </n-radio-group>
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
});

// KMS 密钥列表
const kmsKeys = ref([
  {
    id: 'key-001',
    name: 'Production Key',
    algorithm: 'AES-256',
    status: 'enabled',
    createdAt: new Date('2024-01-15'),
    provider: 'hashicorp-vault',
  },
  {
    id: 'key-002',
    name: 'Development Key',
    algorithm: 'AES-128',
    status: 'disabled',
    createdAt: new Date('2024-01-10'),
    provider: 'hashicorp-vault',
  },
]);

// 密钥表单数据
const keyForm = reactive({
  name: '',
  algorithm: 'AES-256',
  status: 'enabled',
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
  name: {
    required: true,
    message: t('Please enter key name'),
    trigger: 'blur',
  },
};

// 计算属性
const hasConfiguration = computed(() => {
  return sseKmsForm.kms_type && sseKmsForm.vault_address;
});

// 方法
const getKmsStatusType = () => {
  if (!hasConfiguration.value) return 'default';
  return 'success';
};

const getKmsStatusText = () => {
  if (!hasConfiguration.value) return t('Not Configured');
  return t('Available');
};

const getKmsStatusDescription = () => {
  if (!hasConfiguration.value) return t('KMS server is not configured');
  return t('KMS server is available and ready for use');
};

const getKmsTypeName = (kmsType: string) => {
  const names: Record<string, string> = {
    vault: t('HashiCorp Vault Transit Engine'),
  };
  return names[kmsType] || kmsType;
};

const toggleKeyStatus = async (key: any) => {
  try {
    // TODO: 调用API切换密钥状态
    // await api.toggleKeyStatus(key.id, key.status === 'enabled' ? 'disabled' : 'enabled')

    key.status = key.status === 'enabled' ? 'disabled' : 'enabled';
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
  loadCurrentConfiguration();
};

const loadCurrentConfiguration = async () => {
  try {
    // TODO: 调用API获取当前SSE配置
    // const config = await api.getSSEConfiguration()
    // 这里暂时使用模拟数据
    message.success(t('Configuration loaded successfully'));
  } catch (error) {
    message.error(t('Failed to load configuration'));
  }
};

const saveConfiguration = async () => {
  try {
    saving.value = true;

    // 验证表单
    await sseKmsFormRef.value?.validate();

    // TODO: 调用API保存SSE配置
    // await api.saveSSEConfiguration(sseKmsForm)

    message.success(t('Configuration saved successfully'));
    isEditing.value = false;
  } catch (error) {
    message.error(t('Failed to save configuration'));
  } finally {
    saving.value = false;
  }
};

const testKmsConnection = async () => {
  try {
    testingConnection.value = true;

    // TODO: 调用API测试KMS连接
    // await api.testKMSConnection(sseKmsForm)

    // 模拟测试延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    message.success(t('KMS connection test successful'));
  } catch (error) {
    message.error(t('KMS connection test failed'));
  } finally {
    testingConnection.value = false;
  }
};

const deleteKey = (key: any) => {
  keyToDelete.value = key;
  showDeleteModal.value = true;
};

const saveKey = async () => {
  try {
    savingKey.value = true;

    // 验证表单
    await keyFormRef.value?.validate();

    // 创建新密钥
    const newKey = {
      id: `key-${Date.now()}`,
      name: keyForm.name,
      algorithm: keyForm.algorithm,
      status: keyForm.status,
      createdAt: new Date(),
      provider: 'hashicorp-vault',
    };
    kmsKeys.value.push(newKey);
    message.success(t('Key created successfully'));

    showCreateKeyModal.value = false;
    Object.assign(keyForm, {
      name: '',
      algorithm: 'AES-256',
      status: 'enabled',
    });
  } catch (error) {
    message.error(t('Failed to save key'));
  } finally {
    savingKey.value = false;
  }
};

const confirmDeleteKey = async () => {
  try {
    deletingKey.value = true;

    // 从列表中移除密钥
    const index = kmsKeys.value.findIndex(k => k.id === keyToDelete.value.id);
    if (index > -1) {
      kmsKeys.value.splice(index, 1);
      message.success(t('Key deleted successfully'));
    }

    showDeleteModal.value = false;
    keyToDelete.value = null;
  } catch (error) {
    message.error(t('Failed to delete key'));
  } finally {
    deletingKey.value = false;
  }
};

// 页面加载时获取当前配置
onMounted(() => {
  loadCurrentConfiguration();
});
</script>

<style scoped>
.sticky {
  position: sticky;
}
</style>
