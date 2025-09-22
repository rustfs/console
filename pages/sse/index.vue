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
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <n-tag :type="getKmsStatusType()" size="large">
              {{ getKmsStatusText() }}
            </n-tag>
            <div class="text-sm text-gray-500">
              {{ getKmsStatusDescription() }}
            </div>
            <div v-if="sseKmsForm.kms_backend" class="text-sm text-gray-400">
              {{ t('Backend') }}: {{ sseKmsForm.backend_type }}
            </div>
          </div>
          <div class="flex space-x-2">
            <n-button size="small" @click="refreshStatus" :loading="refreshingStatus">
              <template #icon>
                <Icon name="ri:refresh-line" />
              </template>
              {{ t('Refresh') }}
            </n-button>
            <n-button
              size="small"
              @click="clearKMSCache"
              :disabled="sseKmsForm.kms_status !== 'Running'"
              :loading="clearingCache"
            >
              <template #icon>
                <Icon name="ri:delete-bin-line" />
              </template>
              {{ t('Clear Cache') }}
            </n-button>
            <n-button size="small" @click="viewDetailedStatus" :disabled="sseKmsForm.kms_status !== 'Running'">
              <template #icon>
                <Icon name="ri:eye-line" />
              </template>
              {{ t('Details') }}
            </n-button>

            <!-- KMS 启动/停止按钮 -->
            <n-button
              v-if="
                hasConfiguration && (sseKmsForm.kms_status === 'Configured' || isErrorStatus(sseKmsForm.kms_status))
              "
              size="small"
              type="primary"
              @click="startKMSService"
              :loading="startingKMS"
            >
              <template #icon>
                <Icon name="ri:play-line" />
              </template>
              {{ t('Start KMS') }}
            </n-button>

            <n-button
              v-if="hasConfiguration && sseKmsForm.kms_status === 'Running'"
              size="small"
              type="warning"
              @click="stopKMSService"
              :loading="stoppingKMS"
            >
              <template #icon>
                <Icon name="ri:stop-line" />
              </template>
              {{ t('Stop KMS') }}
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- KMS 配置区域 -->
      <n-card :title="t('KMS Configuration')" class="mb-6">
        <div v-if="!isEditing" class="space-y-4">
          <!-- 当前配置显示 -->
          <div v-if="sseKmsForm.backend_type" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div class="flex justify-between items-start">
              <div class="space-y-2">
                <div class="font-medium">
                  {{ t('Current KMS Type') }}: {{ getKmsTypeName(sseKmsForm.backend_type) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  <!-- Vault backend specific fields -->
                  <div v-if="sseKmsForm.backend_type === 'vault'">
                    <div>
                      {{ t('Vault Server') }}:
                      <span v-if="sseKmsForm.address === 'configured-but-hidden'" class="italic text-gray-500">
                        {{ t('(Configuration details are private)') }}
                      </span>
                      <span v-else>{{ sseKmsForm.address || t('Not specified') }}</span>
                    </div>
                    <div v-if="sseKmsForm.mount_path">{{ t('Transit Mount') }}: {{ sseKmsForm.mount_path }}</div>
                    <div v-if="sseKmsForm.kv_mount">{{ t('KV Mount') }}: {{ sseKmsForm.kv_mount }}</div>
                    <div v-if="sseKmsForm.key_path_prefix">
                      {{ t('Key Path Prefix') }}: {{ sseKmsForm.key_path_prefix }}
                    </div>
                    <div v-if="sseKmsForm.auth_type">
                      {{ t('Auth Method') }}: {{ sseKmsForm.auth_type === 'approle' ? 'AppRole' : 'Token' }}
                    </div>
                  </div>

                  <!-- Local backend specific fields -->
                  <div v-if="sseKmsForm.backend_type === 'local'">
                    <div v-if="sseKmsForm.key_directory">{{ t('Key Directory') }}: {{ sseKmsForm.key_directory }}</div>
                    <div v-if="sseKmsForm.has_master_key !== undefined">
                      {{ t('Master Key') }}: {{ sseKmsForm.has_master_key ? t('Configured') : t('Not configured') }}
                    </div>
                  </div>
                  <div v-if="sseKmsForm.timeout_seconds">{{ t('Timeout') }}: {{ sseKmsForm.timeout_seconds }}s</div>
                  <div v-if="sseKmsForm.retry_attempts">{{ t('Retry Attempts') }}: {{ sseKmsForm.retry_attempts }}</div>
                  <div v-if="sseKmsForm.enable_cache !== undefined">
                    {{ t('Cache Enabled') }}: {{ sseKmsForm.enable_cache ? t('Yes') : t('No') }}
                  </div>
                  <div v-if="sseKmsForm.cache_ttl_seconds">
                    {{ t('Cache TTL') }}: {{ sseKmsForm.cache_ttl_seconds }}s
                  </div>
                  <div v-if="sseKmsForm.default_key_id && sseKmsForm.default_key_id !== 'configured-but-hidden'">
                    {{ t('Default Key ID') }}: {{ sseKmsForm.default_key_id }}
                  </div>
                  <div v-else-if="sseKmsForm.default_key_id === 'configured-but-hidden'">
                    {{ t('Default Key ID') }}: <span class="italic text-gray-500">{{ t('(Configured)') }}</span>
                  </div>
                  <div v-if="sseKmsForm.kms_status">
                    {{ t('Status') }}:
                    <n-tag :type="getKmsStatusType()" size="small">
                      {{ getKmsStatusText() }}
                    </n-tag>
                  </div>
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
            <n-form-item :label="t('KMS Type')" path="backend_type">
              <div class="text-gray-700 dark:text-gray-300">
                {{ t('HashiCorp Vault Transit Engine') }}
              </div>
            </n-form-item>

            <!-- HashiCorp Vault 配置 -->
            <n-form-item :label="t('Vault Server Address')" path="address" required>
              <n-input v-model:value="sseKmsForm.address" :placeholder="t('e.g., https://vault.example.com:8200')" />
            </n-form-item>

            <!-- 认证方式选择 -->
            <n-form-item :label="t('Authentication Method')" path="auth_type" required>
              <n-radio-group v-model:value="sseKmsForm.auth_type">
                <n-radio value="token">
                  <div class="flex flex-col">
                    <span class="font-medium">Token</span>
                    <span class="text-xs text-gray-500">{{ t('Use Vault token for authentication') }}</span>
                  </div>
                </n-radio>
                <n-radio value="approle" class="mt-2">
                  <div class="flex flex-col">
                    <span class="font-medium">AppRole</span>
                    <span class="text-xs text-gray-500">{{ t('Use AppRole authentication') }}</span>
                  </div>
                </n-radio>
              </n-radio-group>
            </n-form-item>

            <!-- Token认证字段 -->
            <n-form-item v-if="sseKmsForm.auth_type === 'token'" :label="t('Vault Token')" path="vault_token" required>
              <n-input
                v-model:value="sseKmsForm.vault_token"
                type="password"
                show-password-on="mousedown"
                :placeholder="t('Enter your Vault authentication token')"
              />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Required: Vault authentication token') }}
                </div>
              </template>
            </n-form-item>

            <!-- AppRole认证字段 -->
            <div v-if="sseKmsForm.auth_type === 'approle'" class="space-y-4">
              <n-form-item :label="t('Role ID')" path="vault_app_role_id" required>
                <n-input v-model:value="sseKmsForm.vault_app_role_id" :placeholder="t('Enter AppRole Role ID')" />
                <template #feedback>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ t('AppRole Role ID from Vault') }}
                  </div>
                </template>
              </n-form-item>

              <n-form-item :label="t('Secret ID')" path="vault_app_role_secret_id" required>
                <n-input
                  v-model:value="sseKmsForm.vault_app_role_secret_id"
                  type="password"
                  show-password-on="mousedown"
                  :placeholder="t('Enter AppRole Secret ID')"
                />
                <template #feedback>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ t('AppRole Secret ID from Vault') }}
                  </div>
                </template>
              </n-form-item>
            </div>

            <n-form-item :label="t('Transit Mount Path')" path="mount_path" class="mt-2">
              <n-input v-model:value="sseKmsForm.mount_path" :placeholder="t('transit')" />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Transit engine mount path, default: transit') }}
                </div>
              </template>
            </n-form-item>

            <n-form-item :label="t('KV Mount Path')" path="kv_mount" class="mt-2">
              <n-input v-model:value="sseKmsForm.kv_mount" :placeholder="t('secret')" />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('KV storage mount path, default: secret') }}
                </div>
              </template>
            </n-form-item>

            <n-form-item :label="t('Key Path Prefix')" path="key_path_prefix" class="mt-2">
              <n-input v-model:value="sseKmsForm.key_path_prefix" :placeholder="t('rustfs/kms/keys')" />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Key storage path prefix in KV store') }}
                </div>
              </template>
            </n-form-item>

            <n-form-item :label="t('Timeout (seconds)')" path="timeout_seconds" class="mt-2">
              <n-input-number v-model:value="sseKmsForm.timeout_seconds" :min="1" :max="300" placeholder="30" />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Request timeout in seconds, default: 30') }}
                </div>
              </template>
            </n-form-item>

            <n-form-item :label="t('Retry Attempts')" path="retry_attempts" class="mt-2">
              <n-input-number v-model:value="sseKmsForm.retry_attempts" :min="1" :max="10" placeholder="3" />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Number of retry attempts, default: 3') }}
                </div>
              </template>
            </n-form-item>

            <!-- 默认密钥ID -->
            <n-form-item :label="t('Default Key ID')" path="default_key_id" required class="mt-2">
              <n-input v-model:value="sseKmsForm.default_key_id" :placeholder="t('rustfs-master')" />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Default master key ID for SSE-KMS') }}
                </div>
              </template>
            </n-form-item>

            <!-- 缓存配置 -->
            <n-form-item :label="t('Enable Cache')" path="enable_cache" class="mt-2">
              <n-switch v-model:value="sseKmsForm.enable_cache" />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Enable caching for better performance, default: true') }}
                </div>
              </template>
            </n-form-item>

            <n-form-item
              v-if="sseKmsForm.enable_cache"
              :label="t('Cache TTL (seconds)')"
              path="cache_ttl_seconds"
              class="mt-2"
            >
              <n-input-number v-model:value="sseKmsForm.cache_ttl_seconds" :min="60" :max="3600" placeholder="600" />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Cache time-to-live in seconds, default: 600') }}
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
        <div class="space-y-6">
          <!-- 密钥类型说明 -->
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-3">{{ t('Understanding Key Types') }}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div class="space-y-2">
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span class="font-medium text-purple-700 dark:text-purple-300">{{ t('Master Keys (CMK)') }}</span>
                </div>
                <p class="text-gray-600 dark:text-gray-400 ml-5">
                  {{
                    t('Top-level encryption keys used to encrypt data keys. Managed by KMS and never leave the system.')
                  }}
                </p>
              </div>
              <div class="space-y-2">
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span class="font-medium text-green-700 dark:text-green-300">{{ t('Data Keys (DEK)') }}</span>
                </div>
                <p class="text-gray-600 dark:text-gray-400 ml-5">
                  {{
                    t('Generated from master keys to encrypt your files. Automatically created when encrypting data.')
                  }}
                </p>
              </div>
            </div>
          </div>

          <!-- 主密钥管理区域 -->
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <div class="flex items-center space-x-3">
                <div class="w-4 h-4 bg-purple-500 rounded-full"></div>
                <h3 class="text-lg font-medium">{{ t('Master Keys (CMK)') }}</h3>
                <n-tag type="info" size="small">
                  {{
                    kmsKeys.filter(key => !key.key_type || key.key_type === 'master' || key.key_type === 'CMK').length
                  }}
                </n-tag>
              </div>
              <div class="flex space-x-2">
                <n-button
                  size="small"
                  @click="refreshKeyList"
                  :loading="refreshingKeys"
                  :disabled="sseKmsForm.kms_status !== 'Running'"
                  :title="sseKmsForm.kms_status !== 'Running' ? t('KMS not running') : t('Refresh key list')"
                >
                  <template #icon>
                    <Icon name="ri:refresh-line" />
                  </template>
                  {{ t('Refresh') }}
                </n-button>
                <n-button
                  type="primary"
                  @click="showCreateKeyModal = true"
                  :disabled="!canAddKeys"
                  :title="!canAddKeys ? t('KMS not available for key operations') : ''"
                >
                  <template #icon>
                    <Icon name="ri:add-line" />
                  </template>
                  {{ t('Create Master Key') }}
                </n-button>
              </div>
            </div>

            <!-- 主密钥列表 -->
            <div
              v-if="
                kmsKeys.filter(key => !key.key_type || key.key_type === 'master' || key.key_type === 'CMK').length > 0
              "
              class="space-y-3"
            >
              <div
                v-for="key in kmsKeys.filter(
                  key => !key.key_type || key.key_type === 'master' || key.key_type === 'CMK'
                )"
                :key="key.key_id"
                class="border-l-4 border-purple-500 border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                      <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span class="text-sm font-medium text-purple-700 dark:text-purple-300">{{
                        t('Master Key (CMK)')
                      }}</span>
                    </div>
                    <div class="font-medium">{{ getKeyName(key) }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>{{ t('Key ID') }}: {{ key.key_id }}</div>
                      <div v-if="key.algorithm">{{ t('Algorithm') }}: {{ key.algorithm }}</div>
                      <div>
                        {{ t('Status') }}:
                        <n-tag :type="getKeyStatusType(key)" size="small">
                          {{ getKeyStatusText(key) }}
                        </n-tag>
                      </div>
                      <div v-if="key.createdAt">{{ t('Created') }}: {{ formatDate(new Date(key.createdAt)) }}</div>
                      <div v-else-if="key.creation_date">
                        {{ t('Created') }}: {{ formatDate(new Date(key.creation_date)) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex space-x-2">
                    <n-button size="small" @click="showKeyDetails(key.key_id)" type="info">
                      {{ t('Details') }}
                    </n-button>
                    <n-button
                      size="small"
                      type="error"
                      @click="deleteKeyClick(key)"
                      :disabled="mapKeyState(key) === 'PendingDeletion'"
                      :title="mapKeyState(key) === 'PendingDeletion' ? t('Already pending deletion') : ''"
                    >
                      {{ mapKeyState(key) === 'PendingDeletion' ? t('Deleting...') : t('Delete') }}
                    </n-button>
                    <n-button
                      v-if="mapKeyState(key) === 'PendingDeletion'"
                      size="small"
                      type="error"
                      secondary
                      @click="forceDeleteKeyClick(key)"
                      :disabled="forceDeleting"
                      :title="t('Force delete this key immediately')"
                    >
                      {{ t('Force Delete') }}
                    </n-button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 数据密钥管理区域 -->
          <div
            v-if="kmsKeys.filter(key => key.key_type === 'data' || key.key_type === 'DEK').length > 0"
            class="space-y-4 mt-8"
          >
            <div class="flex items-center space-x-3">
              <div class="w-4 h-4 bg-green-500 rounded-full"></div>
              <h3 class="text-lg font-medium">{{ t('Data Keys (DEK)') }}</h3>
              <n-tag type="success" size="small">
                {{ kmsKeys.filter(key => key.key_type === 'data' || key.key_type === 'DEK').length }}
              </n-tag>
            </div>

            <!-- 数据密钥说明 -->
            <div
              class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 text-sm"
            >
              <p class="text-green-700 dark:text-green-300">
                {{
                  t(
                    'Data keys are automatically generated when encrypting files. They are encrypted by master keys and used for actual data encryption.'
                  )
                }}
              </p>
            </div>

            <!-- 数据密钥列表 -->
            <div class="space-y-3">
              <div
                v-for="key in kmsKeys.filter(key => key.key_type === 'data' || key.key_type === 'DEK')"
                :key="key.key_id"
                class="border-l-4 border-green-500 border rounded-lg p-4 bg-green-50 dark:bg-green-900/10"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                      <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span class="text-sm font-medium text-green-700 dark:text-green-300">{{
                        t('Data Key (DEK)')
                      }}</span>
                    </div>
                    <div class="font-medium">{{ getKeyName(key) }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>{{ t('Key ID') }}: {{ key.key_id }}</div>
                      <div v-if="key.parent_key_id">{{ t('Master Key') }}: {{ key.parent_key_id }}</div>
                      <div v-if="key.algorithm">{{ t('Algorithm') }}: {{ key.algorithm }}</div>
                      <div>
                        {{ t('Status') }}:
                        <n-tag :type="getKeyStatusType(key)" size="small">
                          {{ getKeyStatusText(key) }}
                        </n-tag>
                      </div>
                      <div v-if="key.createdAt">{{ t('Created') }}: {{ formatDate(new Date(key.createdAt)) }}</div>
                      <div v-else-if="key.creation_date">
                        {{ t('Created') }}: {{ formatDate(new Date(key.creation_date)) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex space-x-2">
                    <n-button size="small" @click="showKeyDetails(key.key_id)" type="info">
                      {{ t('Details') }}
                    </n-button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="kmsKeys.length === 0" class="text-center py-8 text-gray-500">
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

      <!-- Bucket 加密配置管理 -->
      <n-card :title="t('Bucket Encryption Management')" class="mt-6">
        <template #header-extra>
          <div class="flex items-center space-x-2">
            <n-button size="small" type="primary" @click="refreshBucketList" :loading="bucketListLoading">
              <Icon name="ri:refresh-line" class="mr-1" />
              {{ t('Refresh') }}
            </n-button>
          </div>
        </template>

        <div class="space-y-4">
          <!-- 搜索和排序 -->
          <div class="flex items-center space-x-4">
            <n-input
              v-model:value="bucketSearchQuery"
              :placeholder="t('Search buckets...')"
              clearable
              class="flex-1"
            >
              <template #prefix>
                <Icon name="ri:search-line" />
              </template>
            </n-input>
            <n-select
              v-model:value="bucketSortBy"
              :options="bucketSortOptions"
              :placeholder="t('Sort by')"
              class="w-40"
            />
          </div>

          <!-- Bucket 列表 -->
          <div v-if="filteredBuckets.length > 0" class="space-y-3">
            <div
              v-for="bucket in filteredBuckets"
              :key="bucket.name"
              class="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex justify-between items-center">
                <div class="flex-1">
                  <div class="flex items-center space-x-3">
                    <Icon name="ri:folder-3-line" class="text-lg text-blue-500" />
                    <div>
                      <h4 class="font-medium text-lg">{{ bucket.name }}</h4>
                      <div class="text-sm text-gray-500">
                        {{ t('Created') }}: {{ formatDateTime(bucket.creationDate) }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex items-center space-x-4">
                  <!-- 加密状态显示 -->
                  <div class="text-center">
                    <div class="text-sm text-gray-500 mb-1">{{ t('Encryption Status') }}</div>
                    <n-tag
                      :type="bucket.encryptionStatus === 'Enabled' ? 'success' : 'default'"
                      size="small"
                    >
                      {{ bucket.encryptionStatus === 'Enabled' ?
                        (bucket.encryptionType === 'SSE-KMS' ? 'SSE-KMS' : 'SSE-S3') :
                        t('Not configured')
                      }}
                    </n-tag>
                  </div>

                  <!-- 操作按钮 -->
                  <div class="flex space-x-2">
                    <n-button
                      size="small"
                      type="primary"
                      @click="configureBucketEncryption(bucket)"
                      :title="t('Configure encryption for this bucket')"
                    >
                      <Icon name="ri:lock-line" class="mr-1" />
                      {{ t('Configure') }}
                    </n-button>
                    <n-button
                      v-if="bucket.encryptionStatus === 'Enabled'"
                      size="small"
                      type="error"
                      secondary
                      @click="removeBucketEncryption(bucket)"
                      :title="t('Remove encryption configuration')"
                    >
                      <Icon name="ri:lock-unlock-line" class="mr-1" />
                      {{ t('Remove') }}
                    </n-button>
                  </div>
                </div>
              </div>

              <!-- 加密详细信息 -->
              <div v-if="bucket.encryptionStatus === 'Enabled'" class="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                <div class="text-sm">
                  <div><strong>{{ t('Algorithm') }}:</strong> {{ bucket.encryptionAlgorithm }}</div>
                  <div v-if="bucket.encryptionType === 'SSE-KMS' && bucket.kmsKeyId">
                    <strong>{{ t('KMS Key ID') }}:</strong> {{ bucket.kmsKeyId }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="!bucketListLoading && buckets.length === 0" class="text-center py-8 text-gray-500">
            <Icon name="ri:folder-2-line" class="text-4xl mx-auto mb-2" />
            <div>{{ t('No buckets found') }}</div>
            <div class="text-sm">{{ t('Create your first bucket to configure encryption') }}</div>
          </div>

          <!-- 搜索无结果 -->
          <div v-else-if="!bucketListLoading && buckets.length > 0 && filteredBuckets.length === 0" class="text-center py-8 text-gray-500">
            <Icon name="ri:search-line" class="text-4xl mx-auto mb-2" />
            <div>{{ t('No buckets match your search') }}</div>
            <div class="text-sm">{{ t('Try adjusting your search terms') }}</div>
          </div>

          <!-- 加载状态 -->
          <div v-if="bucketListLoading" class="text-center py-8">
            <n-spin size="medium" />
            <div class="text-gray-500 mt-2">{{ t('Loading buckets...') }}</div>
          </div>
        </div>
      </n-card>

      <!-- 配置 Bucket 加密模态框 -->
      <n-modal v-model:show="showBucketEncryptModal" :mask-closable="false">
        <n-card
          :title="selectedBucket ? t('Configure Encryption for {bucket}', { bucket: selectedBucket.name }) : t('Configure Bucket Encryption')"
          class="max-w-screen-md"
          :bordered="false"
          size="medium"
          role="dialog"
          aria-modal="true"
        >
          <n-form
            ref="bucketEncryptFormRef"
            :model="bucketEncryptForm"
            :rules="bucketEncryptFormRules"
            label-placement="left"
            :label-width="140"
          >
            <n-form-item :label="t('Encryption Type')" path="encryptionType" required>
              <n-select
                v-model:value="bucketEncryptForm.encryptionType"
                :options="bucketEncryptionOptions"
                :placeholder="t('Select encryption type')"
              />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Choose the encryption method for this bucket') }}
                </div>
              </template>
            </n-form-item>

            <n-form-item
              v-if="bucketEncryptForm.encryptionType === 'SSE-KMS'"
              :label="t('KMS Key')"
              path="kmsKeyId"
              required
            >
              <n-select
                v-model:value="bucketEncryptForm.kmsKeyId"
                :options="kmsKeyOptions"
                :placeholder="t('Select KMS key')"
                :loading="kmsKeysLoading"
              />
              <template #feedback>
                <div class="text-xs text-gray-500 mt-1">
                  {{ t('Select the KMS key to use for encryption') }}
                </div>
              </template>
            </n-form-item>
          </n-form>

          <template #footer>
            <div class="flex justify-end space-x-2">
              <n-button @click="showBucketEncryptModal = false">
                {{ t('Cancel') }}
              </n-button>
              <n-button type="primary" @click="saveBucketEncryption" :loading="savingBucketEncryption">
                {{ t('Configure Encryption') }}
              </n-button>
            </div>
          </template>
        </n-card>
      </n-modal>

      <!-- 移除加密确认模态框 -->
      <n-modal v-model:show="showRemoveEncryptModal" :mask-closable="false">
        <n-card
          :title="t('Confirm Remove Encryption')"
          class="max-w-screen-md"
          :bordered="false"
          size="medium"
          role="dialog"
          aria-modal="true"
        >
          <div class="text-center py-4">
            <Icon name="ri:alert-line" class="text-4xl text-orange-500 mx-auto mb-2" />
            <div class="text-lg font-medium mb-2">
              {{ t('Are you sure you want to remove encryption?') }}
            </div>
            <div v-if="selectedBucket" class="text-blue-600 font-medium mb-2">
              {{ selectedBucket.name }}
            </div>
            <div class="text-gray-500">
              {{ t('Future uploads to this bucket will not be encrypted by default.') }}
            </div>
            <div class="text-gray-500">
              {{ t('Existing encrypted objects will remain encrypted.') }}
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end space-x-2">
              <n-button @click="showRemoveEncryptModal = false">
                {{ t('Cancel') }}
              </n-button>
              <n-button type="warning" @click="confirmRemoveBucketEncryption" :loading="removingBucketEncryption">
                {{ t('Remove Encryption') }}
              </n-button>
            </div>
          </template>
        </n-card>
      </n-modal>

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
            <div v-if="keyToDelete" class="text-blue-600 font-medium mb-2">
              {{ getKeyName(keyToDelete) }}
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

      <!-- 强制删除确认模态框 -->
      <n-modal v-model:show="showForceDeleteModal" :mask-closable="false">
        <n-card
          :title="t('Confirm Force Delete')"
          class="max-w-screen-md"
          :bordered="false"
          size="huge"
          role="dialog"
          aria-modal="true"
        >
          <div class="text-center py-4">
            <Icon name="ri:alert-line" class="text-4xl text-red-500 mx-auto mb-2" />
            <div class="text-lg font-medium mb-2">
              {{ t('Are you sure you want to force delete this key?') }}
            </div>
            <div v-if="keyToForceDelete" class="text-blue-600 font-medium mb-2">
              {{ getKeyName(keyToForceDelete) }}
            </div>
            <div class="text-red-600 font-medium mb-2">
              {{ t('WARNING: This will immediately delete the key') }}
            </div>
            <div class="text-gray-500">
              {{ t('This action cannot be undone and will bypass the normal deletion process.') }}
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end space-x-2">
              <n-button @click="showForceDeleteModal = false">
                {{ t('Cancel') }}
              </n-button>
              <n-button type="error" @click="confirmForceDeleteKey" :loading="forceDeleting">
                {{ t('Force Delete') }}
              </n-button>
            </div>
          </template>
        </n-card>
      </n-modal>

      <!-- 详细状态查看模态框 -->
      <n-modal v-model:show="showDetailedStatusModal" :mask-closable="true">
        <n-card
          :title="t('Detailed KMS Status')"
          class="max-w-screen-md"
          :bordered="false"
          size="medium"
          role="dialog"
          aria-modal="true"
        >
          <div v-if="detailedStatusData" class="space-y-4">
            <n-descriptions :column="2" label-placement="left" bordered>
              <n-descriptions-item :label="t('Backend Type')">
                {{ detailedStatusData.backend_type || 'N/A' }}
              </n-descriptions-item>
              <n-descriptions-item :label="t('Backend Status')">
                {{ detailedStatusData.backend_status || 'N/A' }}
              </n-descriptions-item>
              <n-descriptions-item :label="t('Cache Enabled')">
                <n-tag :type="detailedStatusData.cache_enabled ? 'success' : 'default'" size="small">
                  {{ detailedStatusData.cache_enabled ? t('Enabled') : t('Disabled') }}
                </n-tag>
              </n-descriptions-item>
              <n-descriptions-item :label="t('Default Key ID')">
                {{ detailedStatusData.default_key_id || 'N/A' }}
              </n-descriptions-item>
            </n-descriptions>

            <!-- 缓存统计信息 -->
            <div v-if="detailedStatusData.cache_stats" class="mt-4">
              <h4 class="text-lg font-medium mb-2">{{ t('Cache Statistics') }}</h4>
              <n-descriptions :column="2" label-placement="left" bordered>
                <n-descriptions-item :label="t('Cache Hits')">
                  {{ detailedStatusData.cache_stats.hit_count || 0 }}
                </n-descriptions-item>
                <n-descriptions-item :label="t('Cache Misses')">
                  {{ detailedStatusData.cache_stats.miss_count || 0 }}
                </n-descriptions-item>
                <n-descriptions-item :label="t('Hit Rate')">
                  {{
                    detailedStatusData.cache_stats.hit_count && detailedStatusData.cache_stats.miss_count
                      ? (
                          (detailedStatusData.cache_stats.hit_count /
                            (detailedStatusData.cache_stats.hit_count + detailedStatusData.cache_stats.miss_count)) *
                          100
                        ).toFixed(1) + '%'
                      : 'N/A'
                  }}
                </n-descriptions-item>
                <n-descriptions-item :label="t('Total Requests')">
                  {{
                    (detailedStatusData.cache_stats.hit_count || 0) + (detailedStatusData.cache_stats.miss_count || 0)
                  }}
                </n-descriptions-item>
              </n-descriptions>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <n-button @click="showDetailedStatusModal = false">
                {{ t('Close') }}
              </n-button>
            </div>
          </template>
        </n-card>
      </n-modal>
    </page-content>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
const {
  getKMSStatus,
  getConfiguration,
  configureKMS,
  startKMS,
  stopKMS,
  createKey,
  enableKey,
  disableKey,
  getKeyList,
  deleteKey,
  forceDeleteKey,
  clearCache,
  getDetailedStatus,
  getKeyDetails,
} = useSSE();

const {
  listBuckets,
  getBucketEncryption,
  putBucketEncryption,
  deleteBucketEncryption,
} = useBucket({});

const { t } = useI18n();
const message = useMessage();

// 状态管理
const isEditing = ref(false);
const saving = ref(false);
const testingConnection = ref(false);
const refreshingStatus = ref(false);
const clearingCache = ref(false);
const showDetailedStatusModal = ref(false);
const startingKMS = ref(false);
const stoppingKMS = ref(false);
const detailedStatusData = ref<any>(null);

// 密钥管理状态
const showCreateKeyModal = ref(false);
const showDeleteModal = ref(false);
const showForceDeleteModal = ref(false);
const savingKey = ref(false);
const deletingKey = ref(false);
const forceDeleting = ref(false);
const refreshingKeys = ref(false);
const keyToDelete = ref<any>(null);
const keyToForceDelete = ref<any>(null);

// 本地密钥名称映射存储
const keyNameMapping = ref<Record<string, string>>({});

// Bucket 加密管理状态
const buckets = ref<any[]>([]);
const bucketListLoading = ref(false);
const bucketSearchQuery = ref('');
const bucketSortBy = ref('name');
const showBucketEncryptModal = ref(false);
const showRemoveEncryptModal = ref(false);
const savingBucketEncryption = ref(false);
const removingBucketEncryption = ref(false);
const selectedBucket = ref<any>(null);
const kmsKeysLoading = ref(false);

// 本地存储键名
const KEY_NAME_MAPPING_STORAGE_KEY = 'kms_key_name_mapping';

// 从本地存储加载密钥名称映射
const loadKeyNameMapping = () => {
  try {
    const stored = localStorage.getItem(KEY_NAME_MAPPING_STORAGE_KEY);
    if (stored) {
      keyNameMapping.value = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load key name mapping from localStorage:', error);
    keyNameMapping.value = {};
  }
};

// 保存密钥名称映射到本地存储
const saveKeyNameMapping = () => {
  try {
    localStorage.setItem(KEY_NAME_MAPPING_STORAGE_KEY, JSON.stringify(keyNameMapping.value));
  } catch (error) {
    console.warn('Failed to save key name mapping to localStorage:', error);
  }
};

// 设置密钥名称
const setKeyName = (keyId: string, name: string) => {
  keyNameMapping.value[keyId] = name;
  saveKeyNameMapping();
};

// 删除密钥名称映射
const removeKeyName = (keyId: string) => {
  delete keyNameMapping.value[keyId];
  saveKeyNameMapping();
};

// 定义KMS状态类型
type KmsStatus = 'Running' | 'Configured' | 'NotConfigured' | string | { Error: string } | null;

// 类型守卫函数
const isErrorStatus = (status: KmsStatus): status is { Error: string } => {
  return typeof status === 'object' && status !== null && 'Error' in status;
};

// SSE-KMS 表单数据
const sseKmsForm = reactive({
  backend_type: 'vault',
  address: '',
  auth_type: 'token', // 新增：认证方式选择 'token' 或 'approle'
  vault_token: '',
  vault_app_role_id: '',
  vault_app_role_secret_id: '',
  mount_path: 'transit',
  kv_mount: 'secret',
  key_path_prefix: 'rustfs/kms/keys',
  timeout_seconds: 30,
  retry_attempts: 3,
  default_key_id: 'rustfs-master',
  enable_cache: true,
  cache_ttl_seconds: 600,
  // Local backend specific fields
  key_directory: '',
  has_master_key: false,
  file_permissions: undefined as number | undefined,
  kms_status: '' as KmsStatus, // KMS状态：Running, Stopped, NotConfigured, Error
  kms_backend: null as {
    type?: string;
    address?: string;
    mount_path?: string;
    kv_mount?: string;
    key_path_prefix?: string;
    auth_method?: {
      type?: string;
      token?: string;
      role_id?: string;
      secret_id?: string;
    };
  } | null, // KMS后端信息
  kms_healthy: false, // KMS健康状态
});

// KMS 密钥列表
const kmsKeys = ref<any[]>([]);

// 密钥表单数据
const keyForm = reactive({
  keyName: '',
  algorithm: 'AES-256',
});

// Bucket 加密配置表单
const bucketEncryptForm = reactive({
  encryptionType: '',
  kmsKeyId: '',
});

// Bucket 排序选项
const bucketSortOptions = computed(() => [
  { label: t('Name'), value: 'name' },
  { label: t('Creation Date'), value: 'creationDate' },
]);

// Bucket 加密类型选项
const bucketEncryptionOptions = computed(() => [
  { label: 'SSE-S3', value: 'SSE-S3' },
  { label: 'SSE-KMS', value: 'SSE-KMS' },
]);

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

// Bucket 加密表单引用
const bucketEncryptFormRef = ref();

// KMS表单验证规则
const sseKmsRules = {
  address: {
    required: true,
    message: t('Please enter Vault server address'),
    trigger: 'blur',
  },
  vault_token: {
    required: true,
    message: t('Please enter Vault token'),
    trigger: 'blur',
  },
  default_key_id: {
    required: true,
    message: t('Please enter default key ID'),
    trigger: 'blur',
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

// Bucket 加密表单验证规则
const bucketEncryptFormRules = {
  encryptionType: {
    required: true,
    message: t('Please select encryption type'),
    trigger: 'change',
  },
  kmsKeyId: {
    required: true,
    validator: (rule: any, value: string) => {
      if (bucketEncryptForm.encryptionType === 'SSE-KMS' && !value) {
        return new Error(t('Please select a KMS key for SSE-KMS encryption'));
      }
      return true;
    },
    trigger: 'change',
  },
};

// 计算属性
const hasConfiguration = computed(() => {
  // 判断是否有KMS配置的标准：
  // 1. 有backend_type
  // 2. KMS状态不是 'NotConfigured' 或者有地址信息
  // 3. 或者有默认密钥ID（说明已经配置过）
  return (
    sseKmsForm.backend_type &&
    ((sseKmsForm.kms_status && sseKmsForm.kms_status !== 'NotConfigured') ||
      sseKmsForm.address ||
      sseKmsForm.default_key_id)
  );
});

// 计算属性：是否可以添加密钥
const canAddKeys = computed(() => {
  // 只有在配置完成且状态为Running且健康时才允许添加密钥
  return hasConfiguration.value && sseKmsForm.kms_status === 'Running' && sseKmsForm.kms_healthy;
});

// 计算属性：过滤和排序后的bucket列表
const filteredBuckets = computed(() => {
  let filtered = [...buckets.value];

  // 搜索过滤
  if (bucketSearchQuery.value) {
    const query = bucketSearchQuery.value.toLowerCase();
    filtered = filtered.filter(bucket =>
      bucket.name.toLowerCase().includes(query)
    );
  }

  // 排序
  filtered.sort((a, b) => {
    if (bucketSortBy.value === 'name') {
      return a.name.localeCompare(b.name);
    } else if (bucketSortBy.value === 'creationDate') {
      return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
    }
    return 0;
  });

  return filtered;
});

// 计算属性：KMS密钥选项（用于bucket加密配置）
const kmsKeyOptions = computed(() => {
  return getMasterKeys().map((key: any) => ({
    label: getKeyName(key),
    value: key.key_id,
  }));
});

// 辅助函数：获取主密钥列表
const getMasterKeys = () => {
  return kmsKeys.value.filter(key => {
    // 判断密钥类型：
    // 1. 如果有key_type字段，则使用该字段
    // 2. 如果没有key_type字段，默认认为是主密钥
    // 3. 如果key_id以特定前缀开头，可能是数据密钥
    return !key.key_type || key.key_type === 'master' || key.key_type === 'CMK';
  });
};

// 辅助函数：获取数据密钥列表
const getDataKeys = () => {
  return kmsKeys.value.filter(key => {
    return key.key_type === 'data' || key.key_type === 'DEK';
  });
};

// 辅助函数：判断密钥类型
const getKeyType = (key: any) => {
  if (key.key_type === 'data' || key.key_type === 'DEK') {
    return 'data';
  }
  return 'master';
};

// 辅助函数：获取密钥名称
const getKeyName = (key: any) => {
  // 优先从后端的 description 字段获取名称（持久化的）
  if (key.description) {
    return key.description;
  }

  // 然后从 metadata 或 tags 中获取名称
  // 优先使用 tags.name（新的标准格式），fallback 到 metadata.name（向后兼容）
  const name = key.tags?.name || key.metadata?.name;
  if (name) {
    return name;
  }

  // 从本地存储的映射中获取名称（临时的，向后兼容）
  const localName = keyNameMapping.value[key.key_id];
  if (localName) {
    return localName;
  }

  // 最后显示密钥ID的前8位
  return key.key_id ? `Key-${key.key_id.substring(0, 8)}` : 'Unnamed Key';
};

// 辅助函数：获取密钥类型显示名称
const getKeyTypeName = (key: any) => {
  const type = getKeyType(key);
  return type === 'data' ? t('Data Key (DEK)') : t('Master Key (CMK)');
};

// 辅助函数：获取密钥类型颜色
const getKeyTypeColor = (key: any) => {
  const type = getKeyType(key);
  return type === 'data' ? 'green' : 'purple';
};

// 方法
const getKmsStatusType = () => {
  if (!hasConfiguration.value) return 'default';

  // 处理Error状态（可能是对象格式）
  if (isErrorStatus(sseKmsForm.kms_status)) {
    return 'error';
  }

  // 根据KMS状态返回不同的标签类型
  switch (sseKmsForm.kms_status) {
    case 'Running':
      return sseKmsForm.kms_healthy ? 'success' : 'warning';
    case 'Configured':
      return 'info';
    case 'NotConfigured':
      return 'default';
    default:
      return 'default';
  }
};

const getKmsStatusText = () => {
  if (!hasConfiguration.value) return t('Not Configured');

  // 根据KMS状态返回不同的状态文本
  // 注意：后端的Error状态是 Error(String) 格式，会被序列化为对象
  if (isErrorStatus(sseKmsForm.kms_status)) {
    return t('Error');
  }

  switch (sseKmsForm.kms_status) {
    case 'Running':
      return sseKmsForm.kms_healthy ? t('Running') : t('Running (Unhealthy)');
    case 'Configured':
      return t('Configured');
    case 'NotConfigured':
      return t('Not Configured');
    default:
      return t('Unknown');
  }
};

const getKmsStatusDescription = () => {
  if (!hasConfiguration.value) return t('KMS server is not configured');

  // 处理Error状态（可能是对象格式）
  if (isErrorStatus(sseKmsForm.kms_status)) {
    return t('KMS server has errors') + ': ' + sseKmsForm.kms_status.Error;
  }

  // 根据KMS状态返回不同的描述
  switch (sseKmsForm.kms_status) {
    case 'Running':
      // 如果KMS运行但配置详情为空，说明是配置详情不可见的状态
      if (sseKmsForm.kms_healthy && (!sseKmsForm.address || sseKmsForm.address === 'configured-but-hidden')) {
        return t('KMS server is running, configuration details are private');
      }
      return sseKmsForm.kms_healthy ? t('KMS server is running and healthy') : t('KMS server is running but unhealthy');
    case 'Configured':
      return t('KMS server is configured but not running');
    case 'NotConfigured':
      return t('KMS server is not configured');
    default:
      return t('KMS server status unknown');
  }
};

// 将后端的 key_state 映射到前端期望的状态值
const mapKeyState = (key: any) => {
  // 后端使用 key_state 字段，前端使用 status 字段
  const keyState = key.key_state || key.status;

  switch (keyState) {
    case 'Enabled':
      return 'Active';
    case 'Disabled':
      return 'Disabled';
    case 'PendingDeletion':
      return 'PendingDeletion';
    case 'Unavailable':
      return 'Inactive';
    default:
      return keyState;
  }
};

// 获取密钥状态标签类型
const getKeyStatusType = (key: any) => {
  const status = mapKeyState(key);
  switch (status) {
    case 'Active':
      return 'success';
    case 'Inactive':
      return 'default';
    case 'PendingDeletion':
      return 'warning';
    case 'Disabled':
      return 'default';
    default:
      return 'default';
  }
};

// 获取密钥状态显示文本
const getKeyStatusText = (key: any) => {
  const status = mapKeyState(key);
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

// 获取认证方式显示名称
const getAuthMethodName = () => {
  // 从 KMS 后端信息中获取认证方式
  if (sseKmsForm.kms_backend && sseKmsForm.kms_backend.auth_method) {
    if (sseKmsForm.kms_backend.auth_method.type === 'token') {
      return t('Token');
    } else if (sseKmsForm.kms_backend.auth_method.type === 'approle') {
      return t('AppRole');
    }
  }
  return t('Not configured');
};

const showKeyDetails = async (keyId: string) => {
  try {
    const keyDetails = await getKeyDetails(keyId);
    // 可以在这里显示密钥详情模态框，或者跳转到详情页面
    message.info(`Key Details: ${JSON.stringify(keyDetails, null, 2)}`);
  } catch (error) {
    message.error(t('Failed to get key details'));
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
  if (!sseKmsForm.backend_type) {
    sseKmsForm.backend_type = 'vault';
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
    // 先获取KMS服务状态
    const statusResponse = await getKMSStatus();
    console.log('KMS Status Response:', statusResponse); // 临时调试日志

    // 检查服务状态
    if (!statusResponse || statusResponse.status === 'NotConfigured') {
      // KMS未配置，清空表单并进入编辑模式
      Object.assign(sseKmsForm, {
        backend_type: '',
        address: '',
        auth_type: 'token', // 默认选择token认证
        vault_token: '',
        vault_app_role_id: '',
        vault_app_role_secret_id: '',
        mount_path: 'transit',
        kv_mount: '',
        key_path_prefix: '',
        cache_ttl_seconds: 300,
        timeout_seconds: 30,
        default_key_id: '',
        kms_status: 'NotConfigured',
        kms_backend: null,
        kms_healthy: false,
      });
      isEditing.value = true;
      message.info(t('KMS is not configured, please configure it first'));
      return;
    }

    // 如果服务已配置，更新状态信息
    sseKmsForm.kms_status = statusResponse.status;
    sseKmsForm.kms_healthy = statusResponse.healthy;

    // 如果服务状态不是运行中，显示相应信息但不获取配置
    if (statusResponse.status !== 'Running') {
      if (statusResponse.status === 'Stopped') {
        message.warning(t('KMS service is stopped'));
      } else if (statusResponse.status === 'Error') {
        message.error(t('KMS service has errors'));
      }
      // 仍然尝试获取配置以显示当前设置
    }

    // 直接从状态响应中获取配置信息
    if (statusResponse.config_summary) {
      const configResponse = statusResponse.config_summary;
      console.log('Config Summary from Status:', configResponse); // 临时调试日志
      console.log('Config Summary Type:', typeof configResponse);
      console.log('Config Summary Keys:', Object.keys(configResponse || {}));
      if (configResponse.backend_summary) {
        console.log('Backend Summary:', configResponse.backend_summary);
        console.log('Backend Summary Keys:', Object.keys(configResponse.backend_summary));
        if (configResponse.backend_summary.backend_type === 'vault') {
          console.log('Vault Config:', configResponse.backend_summary);
          console.log('Vault Address:', configResponse.backend_summary.address);
        }
      } else {
        console.log('No backend_summary found in config_summary');
      }

      Object.assign(sseKmsForm, {
        backend_type: configResponse.backend_type?.toLowerCase() || 'vault',
        default_key_id: configResponse.default_key_id || '',
        enable_cache: configResponse.enable_cache !== undefined ? configResponse.enable_cache : true,
        timeout_seconds: configResponse.timeout_seconds || 30,
        retry_attempts: configResponse.retry_attempts || 3,
      });

      // 处理缓存配置
      if (configResponse.cache_summary) {
        sseKmsForm.cache_ttl_seconds = configResponse.cache_summary.ttl_seconds || 300;
      }

      // 根据backend_summary提取后端特定配置
      if (configResponse.backend_summary) {
        if (configResponse.backend_summary.backend_type === 'vault') {
          // Vault后端配置
          const vaultConfig = configResponse.backend_summary;
          Object.assign(sseKmsForm, {
            address: vaultConfig.address || '',
            mount_path: vaultConfig.mount_path || 'transit',
            kv_mount: vaultConfig.kv_mount || 'secret',
            key_path_prefix: vaultConfig.key_path_prefix || 'rustfs/kms/keys',
          });

          // 设置认证方式（基于auth_method_type推断）
          sseKmsForm.auth_type = vaultConfig.auth_method_type === 'approle' ? 'approle' : 'token';
          sseKmsForm.vault_token = '***'; // 显示掩码表示已配置
          sseKmsForm.vault_app_role_id = '';
          sseKmsForm.vault_app_role_secret_id = '';
        } else if (configResponse.backend_summary.backend_type === 'local') {
          // Local后端配置
          const localConfig = configResponse.backend_summary;
          Object.assign(sseKmsForm, {
            key_directory: localConfig.key_dir || '',
            has_master_key: localConfig.has_master_key || false,
            file_permissions: localConfig.file_permissions,
          });
        }
      }

      // 构建后端信息用于显示
      sseKmsForm.kms_backend = {
        type: sseKmsForm.backend_type,
        address: sseKmsForm.address,
        mount_path: sseKmsForm.mount_path,
        kv_mount: sseKmsForm.kv_mount,
        key_path_prefix: sseKmsForm.key_path_prefix,
        auth_method: {
          type: 'token', // 默认假设是token认证
        },
      };

      message.success(t('Configuration loaded successfully'));
    } else {
      // 如果没有配置信息，但状态服务正常，说明KMS已配置但详情不可见
      console.log('No config_summary in status response, KMS may be configured but details are private');
      sseKmsForm.backend_type = statusResponse.backend_type?.toLowerCase() || 'vault';
      sseKmsForm.default_key_id = 'configured-but-hidden'; // 设置一个标识表示已配置
      sseKmsForm.address = 'configured-but-hidden';

      // 构建最小的后端信息用于显示
      sseKmsForm.kms_backend = {
        type: sseKmsForm.backend_type,
        address: 'configured-but-hidden',
        mount_path: 'transit',
        kv_mount: 'secret',
        key_path_prefix: 'rustfs/kms/keys',
        auth_method: {
          type: 'configured-but-hidden',
        },
      };
    }
  } catch (error) {
    console.error('Failed to load KMS status:', error);

    // 检查是否是服务未初始化的错误
    if (error instanceof Error && error.message && error.message.includes('KMS service not initialized')) {
      // 清空表单并进入编辑模式
      Object.assign(sseKmsForm, {
        backend_type: '',
        address: '',
        auth_type: 'token', // 默认选择token认证
        vault_token: '',
        vault_app_role_id: '',
        vault_app_role_secret_id: '',
        mount_path: 'transit',
        kv_mount: '',
        key_path_prefix: '',
        cache_ttl_seconds: 300,
        timeout_seconds: 30,
        default_key_id: '',
        kms_status: 'NotConfigured',
        kms_backend: null,
        kms_healthy: false,
      });
      isEditing.value = true;
      message.info(t('KMS service not initialized, please configure it first'));
    } else {
      // 其他错误，进入编辑模式
      isEditing.value = true;
      message.error(t('Failed to load KMS status'));
    }
  }
};

// 加载密钥列表
const loadKeyList = async () => {
  try {
    const response = await getKeyList();
    console.log('Key List Response:', response); // 调试日志
    console.log('Key List Response Type:', typeof response);
    console.log('Key List Response Keys:', Object.keys(response || {}));

    // 适配新的API响应格式
    if (response && response.success !== false) {
      kmsKeys.value = response.keys || [];
      console.log('Loaded keys:', kmsKeys.value.length);
    } else {
      console.log('Key list failed:', response);
      message.warning(response?.message || t('Failed to load key list'));
      kmsKeys.value = [];
    }
  } catch (error) {
    console.error('Failed to load key list:', error);
    console.error('Error details:', {
      message: (error as any)?.message,
      status: (error as any)?.status,
      response: (error as any)?.response,
    });
    message.error(t('Failed to load key list'));
    kmsKeys.value = [];
  }
};

// 刷新密钥列表
const refreshKeyList = async () => {
  try {
    refreshingKeys.value = true;
    await loadKeyList();
    message.success(t('Key list refreshed'));
  } catch (error) {
    console.error('Failed to refresh key list:', error);
    message.error(t('Failed to refresh key list'));
  } finally {
    refreshingKeys.value = false;
  }
};

// 设置为本地开发
const setLocalDevelopment = async () => {
  try {
    await configureKMS({
      kms_type: 'local',
    });

    message.success(t('Local development mode set successfully'));

    // 重新加载配置状态
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

    // 调用API保存KMS配置 - 适配新的平铺参数格式
    const configData: any = {
      backend_type: 'vault',
      address: sseKmsForm.address,
      mount_path: sseKmsForm.mount_path,
      kv_mount: sseKmsForm.kv_mount,
      key_path_prefix: sseKmsForm.key_path_prefix,
      timeout_seconds: parseInt(sseKmsForm.timeout_seconds.toString()) || 30,
      retry_attempts: parseInt(sseKmsForm.retry_attempts.toString()) || 3,
      default_key_id: sseKmsForm.default_key_id || null,
      enable_cache: sseKmsForm.enable_cache,
      cache_ttl_seconds: sseKmsForm.cache_ttl_seconds || 600,
    };

    // 根据选择的认证方式添加相应的字段
    if (sseKmsForm.auth_type === 'token') {
      if (sseKmsForm.vault_token && sseKmsForm.vault_token !== '***') {
        // Token 认证方式
        configData.auth_method = {
          token: sseKmsForm.vault_token,
        };
      } else if (sseKmsForm.vault_token === '***') {
        // 如果显示的是掩码，说明已经有配置，不需要重新设置认证信息
        delete configData.auth_method;
      } else {
        message.error(t('Please enter Vault token'));
        return;
      }
    } else if (sseKmsForm.auth_type === 'approle') {
      if (
        sseKmsForm.vault_app_role_id &&
        sseKmsForm.vault_app_role_secret_id &&
        sseKmsForm.vault_app_role_id !== '***' &&
        sseKmsForm.vault_app_role_secret_id !== '***'
      ) {
        // AppRole 认证方式
        configData.auth_method = {
          role_id: sseKmsForm.vault_app_role_id,
          secret_id: sseKmsForm.vault_app_role_secret_id,
        };
      } else if (sseKmsForm.vault_app_role_id === '***' || sseKmsForm.vault_app_role_secret_id === '***') {
        // 如果显示的是掩码，说明已经有配置，不需要重新设置认证信息
        delete configData.auth_method;
      } else {
        message.error(t('Please enter both Role ID and Secret ID'));
        return;
      }
    } else {
      message.error(t('Please select authentication method'));
      return;
    }

    const response = await configureKMS(configData);

    // 处理配置响应，更新KMS状态
    if (response && response.status) {
      sseKmsForm.kms_status = response.status;
      // 如果配置成功，假设服务健康
      if (response.success !== false) {
        sseKmsForm.kms_healthy = true;
      }
    }

    // 更新显示的配置信息（保留用户刚刚输入的值）
    // 这样用户可以看到他们刚刚保存的配置
    if (configData.address) {
      sseKmsForm.address = configData.address;
    }

    message.success(t('Configuration saved successfully'));
    isEditing.value = false;
    loadKMSStatus();
  } catch (error) {
    console.error('KMS Configuration save error:', error);
    let errorMessage = t('Failed to save configuration');

    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage += `: ${error.message}`;
    } else if (error && typeof error === 'object' && 'response' in error) {
      const response = error.response as any;
      if (response?.data?.message) {
        errorMessage += `: ${response.data.message}`;
      } else if (response?.statusText) {
        errorMessage += `: ${response.statusText}`;
      }
    } else if (typeof error === 'string') {
      errorMessage += `: ${error}`;
    }

    message.error(errorMessage);
  } finally {
    saving.value = false;
  }
};

const deleteKeyClick = (key: any) => {
  // 如果密钥已经在删除中，显示提示
  if (mapKeyState(key) === 'PendingDeletion') {
    message.info(t('Key is already pending deletion'));
    return;
  }

  keyToDelete.value = key;
  showDeleteModal.value = true;
};

const forceDeleteKeyClick = (key: any) => {
  keyToForceDelete.value = key;
  showForceDeleteModal.value = true;
};

const saveKey = async () => {
  try {
    savingKey.value = true;

    // 验证表单
    await keyFormRef.value?.validate();

    // 调用API创建密钥 - 适配新的参数格式
    const createKeyData = {
      KeyUsage: 'EncryptDecrypt',
      Description: keyForm.keyName ? `${keyForm.keyName} (${keyForm.algorithm})` : `Master Key (${keyForm.algorithm})`,
      Tags: {
        name: keyForm.keyName,
        algorithm: keyForm.algorithm,
        created_by: 'console',
        created_at: new Date().toISOString(),
      },
    };

    console.log('Creating key with data:', createKeyData);
    const response = await createKey(createKeyData);
    console.log('Create key response:', response);

    // 密钥名称已通过 description 字段保存到后端，无需额外处理

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

    // 调用API删除密钥 - 适配新的参数格式
    await deleteKey(keyToDelete.value.key_id);

    // 密钥删除后，名称信息也随之从后端删除

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

const confirmForceDeleteKey = async () => {
  try {
    forceDeleting.value = true;

    // 调用强制删除API
    await forceDeleteKey(keyToForceDelete.value.key_id);

    message.success(t('Key force deleted successfully'));
    showForceDeleteModal.value = false;
    keyToForceDelete.value = null;

    // 重新加载密钥列表
    await loadKeyList();
  } catch (error) {
    message.error(t('Failed to force delete key'));
  } finally {
    forceDeleting.value = false;
  }
};

// 新增功能方法
const refreshStatus = async () => {
  try {
    refreshingStatus.value = true;
    await loadKMSStatus();
    message.success(t('Status refreshed successfully'));
  } catch (error) {
    message.error(t('Failed to refresh status'));
  } finally {
    refreshingStatus.value = false;
  }
};

const clearKMSCache = async () => {
  try {
    clearingCache.value = true;
    const result = await clearCache();
    if (result.status === 'success') {
      message.success(t('Cache cleared successfully'));
    } else {
      message.warning(result.message || t('Cache clear completed with warnings'));
    }
  } catch (error) {
    message.error(t('Failed to clear cache'));
  } finally {
    clearingCache.value = false;
  }
};

const viewDetailedStatus = async () => {
  try {
    const detailedStatus = await getDetailedStatus();
    detailedStatusData.value = detailedStatus;
    showDetailedStatusModal.value = true;
  } catch (error) {
    message.error(t('Failed to get detailed status'));
  }
};

// 监听 KMS 类型变化，重置 vault 字段为默认值
watch(
  () => sseKmsForm.backend_type,
  newValue => {
    if (newValue === 'vault') {
      // 切换到 vault 类型时，重置 vault 字段为默认值
      sseKmsForm.mount_path = 'transit';
      sseKmsForm.timeout_seconds = 30;
    }
  }
);

// 启动KMS服务
const startKMSService = async () => {
  try {
    startingKMS.value = true;
    const response = await startKMS();

    if (response && response.success) {
      message.success(t('KMS service started successfully'));
      sseKmsForm.kms_status = response.status;
      await loadKMSStatus();

      // 刷新密钥列表
      await loadKeyList();
    } else {
      message.error(t('Failed to start KMS service') + ': ' + (response?.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Failed to start KMS service:', error);
    message.error(t('Failed to start KMS service'));
  } finally {
    startingKMS.value = false;
  }
};

// 停止KMS服务
const stopKMSService = async () => {
  try {
    stoppingKMS.value = true;
    const response = await stopKMS();

    if (response && response.success) {
      message.success(t('KMS service stopped successfully'));
      sseKmsForm.kms_status = response.status;
      await loadKMSStatus();
    } else {
      message.error(t('Failed to stop KMS service') + ': ' + (response?.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Failed to stop KMS service:', error);
    message.error(t('Failed to stop KMS service'));
  } finally {
    stoppingKMS.value = false;
  }
};

// =========================
// Bucket 加密管理相关方法
// =========================

// 加载bucket列表
const loadBucketList = async () => {
  bucketListLoading.value = true;
  try {
    const response = await listBuckets();
    if (response && response.Buckets) {
      // 并行获取每个bucket的加密配置
      const bucketList = await Promise.all(
        response.Buckets.map(async (bucket: any) => {
          try {
            const encryptionConfig = await getBucketEncryption(bucket.Name);

            let encryptionStatus = 'Disabled';
            let encryptionType = '';
            let encryptionAlgorithm = '';
            let kmsKeyId = '';

            if (encryptionConfig &&
                encryptionConfig.ServerSideEncryptionConfiguration &&
                encryptionConfig.ServerSideEncryptionConfiguration.Rules &&
                encryptionConfig.ServerSideEncryptionConfiguration.Rules.length > 0) {
              const rule = encryptionConfig.ServerSideEncryptionConfiguration.Rules[0];
              if (rule.ApplyServerSideEncryptionByDefault) {
                encryptionStatus = 'Enabled';
                const algorithm = rule.ApplyServerSideEncryptionByDefault.SSEAlgorithm;

                if (algorithm === 'aws:kms') {
                  encryptionType = 'SSE-KMS';
                  encryptionAlgorithm = 'AES-256 (KMS)';
                  kmsKeyId = rule.ApplyServerSideEncryptionByDefault.KMSMasterKeyID || '';
                } else if (algorithm === 'AES256') {
                  encryptionType = 'SSE-S3';
                  encryptionAlgorithm = 'AES-256 (S3)';
                }
              }
            }

            return {
              name: bucket.Name,
              creationDate: bucket.CreationDate,
              encryptionStatus,
              encryptionType,
              encryptionAlgorithm,
              kmsKeyId,
            };
          } catch (error) {
            // 如果获取加密配置失败（如404），则认为未配置加密
            return {
              name: bucket.Name,
              creationDate: bucket.CreationDate,
              encryptionStatus: 'Disabled',
              encryptionType: '',
              encryptionAlgorithm: '',
              kmsKeyId: '',
            };
          }
        })
      );

      buckets.value = bucketList;
    }
  } catch (error) {
    console.error('Failed to load bucket list:', error);
    message.error(t('Failed to load bucket list'));
  } finally {
    bucketListLoading.value = false;
  }
};

// 刷新bucket列表
const refreshBucketList = async () => {
  await loadBucketList();
  message.success(t('Bucket list refreshed'));
};

// 配置bucket加密
const configureBucketEncryption = (bucket: any) => {
  selectedBucket.value = bucket;

  // 初始化表单数据
  if (bucket.encryptionStatus === 'Enabled') {
    bucketEncryptForm.encryptionType = bucket.encryptionType;
    bucketEncryptForm.kmsKeyId = bucket.kmsKeyId || '';
  } else {
    bucketEncryptForm.encryptionType = '';
    bucketEncryptForm.kmsKeyId = '';
  }

  showBucketEncryptModal.value = true;
};

// 移除bucket加密
const removeBucketEncryption = (bucket: any) => {
  selectedBucket.value = bucket;
  showRemoveEncryptModal.value = true;
};

// 保存bucket加密配置
const saveBucketEncryption = async () => {
  try {
    await bucketEncryptFormRef.value?.validate();

    if (!selectedBucket.value) {
      message.error(t('No bucket selected'));
      return;
    }

    savingBucketEncryption.value = true;

    const encryptionConfig: any = {
      Rules: [
        {
          ApplyServerSideEncryptionByDefault: {},
        },
      ],
    };

    if (bucketEncryptForm.encryptionType === 'SSE-KMS') {
      encryptionConfig.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm = 'aws:kms';
      encryptionConfig.Rules[0].ApplyServerSideEncryptionByDefault.KMSMasterKeyID = bucketEncryptForm.kmsKeyId;
    } else if (bucketEncryptForm.encryptionType === 'SSE-S3') {
      encryptionConfig.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm = 'AES256';
    }

    await putBucketEncryption(selectedBucket.value.name, encryptionConfig);

    message.success(t('Bucket encryption configured successfully'));
    showBucketEncryptModal.value = false;

    // 刷新bucket列表
    await loadBucketList();
  } catch (error: any) {
    console.error('Failed to configure bucket encryption:', error);
    message.error(t('Failed to configure bucket encryption') + ': ' + error.message);
  } finally {
    savingBucketEncryption.value = false;
  }
};

// 确认移除bucket加密
const confirmRemoveBucketEncryption = async () => {
  if (!selectedBucket.value) {
    message.error(t('No bucket selected'));
    return;
  }

  removingBucketEncryption.value = true;
  try {
    await deleteBucketEncryption(selectedBucket.value.name);
    message.success(t('Bucket encryption removed successfully'));
    showRemoveEncryptModal.value = false;

    // 刷新bucket列表
    await loadBucketList();
  } catch (error: any) {
    console.error('Failed to remove bucket encryption:', error);
    message.error(t('Failed to remove bucket encryption') + ': ' + error.message);
  } finally {
    removingBucketEncryption.value = false;
  }
};

// 格式化日期时间
const formatDateTime = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleString();
  } catch (error) {
    return dateString;
  }
};

// 页面加载时获取当前配置和密钥列表
onMounted(async () => {
  await loadKMSStatus();

  // 只有在KMS配置正确且状态为Running时才加载密钥列表
  if (sseKmsForm.kms_status === 'Running' && sseKmsForm.kms_healthy) {
    await loadKeyList();
  }

  // 加载bucket列表
  await loadBucketList();
});
</script>

<style scoped>
.sticky {
  position: sticky;
}
</style>
