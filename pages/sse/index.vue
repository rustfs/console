<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Server-Side Encryption (SSE) Configuration') }}</h1>
      <template #description>
        <p class="text-gray-600 dark:text-gray-400">
          {{ t('Configure server-side encryption for your objects using external key management services.') }}
        </p>
      </template>
    </page-header>

    <div class="space-y-8">
      <!-- KMS 总览 -->
      <Card class="shadow-none">
        <CardHeader class="space-y-2">
          <div class="flex flex-wrap items-center gap-3">
            <CardTitle class="text-base sm:text-lg">{{ t('KMS Status Overview') }}</CardTitle>
            <Badge :variant="kmsStatusVariant" class="text-sm uppercase">
              {{ getKmsStatusText() }}
            </Badge>
          </div>
          <CardDescription>
            {{ getKmsStatusDescription() }}
          </CardDescription>
          <CardDescription v-if="sseKmsForm.kms_backend">
            {{ t('Backend') }}: {{ sseKmsForm.backend_type }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div class="rounded-md border bg-muted/40 p-3">
              <p class="text-xs text-muted-foreground">{{ t('Backend Type') }}</p>
              <p class="text-sm font-medium text-foreground">
                {{ sseKmsForm.backend_type ? getKmsTypeName(sseKmsForm.backend_type) : t('Not configured') }}
              </p>
            </div>
            <div class="rounded-md border bg-muted/40 p-3">
              <p class="text-xs text-muted-foreground">{{ t('Cache Status') }}</p>
              <p class="text-sm font-medium text-foreground">
                {{ sseKmsForm.enable_cache ? t('Enabled') : t('Disabled') }}
              </p>
            </div>
            <div class="rounded-md border bg-muted/40 p-3">
              <p class="text-xs text-muted-foreground">{{ t('Default Key ID') }}</p>
              <p class="text-sm font-medium text-foreground">
                {{ sseKmsForm.default_key_id || t('Not configured') }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="outline" :loading="refreshingStatus" @click="refreshStatus">
              <Icon name="ri:refresh-line" class="mr-2 size-4" />
              {{ t('Refresh') }}
            </Button>
            <Button size="sm" variant="outline" :disabled="sseKmsForm.kms_status !== 'Running'" :loading="clearingCache" @click="clearKMSCache">
              <Icon name="ri:delete-bin-line" class="mr-2 size-4" />
              {{ t('Clear Cache') }}
            </Button>
            <Button size="sm" variant="outline" :disabled="sseKmsForm.kms_status !== 'Running'" @click="viewDetailedStatus">
              <Icon name="ri:eye-line" class="mr-2 size-4" />
              {{ t('Details') }}
            </Button>
            <Button
              v-if="hasConfiguration && (sseKmsForm.kms_status === 'Configured' || isErrorStatus(sseKmsForm.kms_status))"
              size="sm"
              variant="default"
              :loading="startingKMS"
              @click="startKMSService"
            >
              <Icon name="ri:play-line" class="mr-2 size-4" />
              {{ t('Start KMS') }}
            </Button>
            <Button
              v-if="hasConfiguration && sseKmsForm.kms_status === 'Running'"
              size="sm"
              variant="outline"
              :loading="stoppingKMS"
              @click="stopKMSService"
            >
              <Icon name="ri:stop-line" class="mr-2 size-4" />
              {{ t('Stop KMS') }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- KMS 配置区域 -->
      <Card class="shadow-none">
        <CardHeader class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-1">
            <CardTitle>{{ t('KMS Configuration') }}</CardTitle>
            <CardDescription>
              {{ t('Manage how RustFS connects to your external key management service.') }}
            </CardDescription>
          </div>
          <div v-if="!isEditing" class="flex gap-2">
            <Button size="sm" variant="default" @click="startEditing">
              {{ hasConfiguration ? t('Edit Configuration') : t('Configure KMS') }}
            </Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-6">
          <div v-if="!isEditing" class="space-y-4">
            <div v-if="sseKmsForm.backend_type" class="rounded-lg border bg-muted/30 p-4 dark:bg-muted/10">
              <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div class="space-y-2">
                  <p class="text-sm font-semibold text-foreground">
                    {{ t('Current KMS Type') }}: {{ getKmsTypeName(sseKmsForm.backend_type) }}
                  </p>
                  <div class="space-y-2 text-sm text-muted-foreground">
                    <!-- Vault backend specific fields -->
                    <template v-if="sseKmsForm.backend_type === 'vault'">
                      <div>
                        {{ t('Vault Server') }}:
                        <span v-if="sseKmsForm.address === 'configured-but-hidden'" class="italic">
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
                    </template>

                    <!-- Local backend specific fields -->
                    <template v-if="sseKmsForm.backend_type === 'local'">
                      <div v-if="sseKmsForm.key_directory">{{ t('Key Directory') }}: {{ sseKmsForm.key_directory }}</div>
                      <div v-if="sseKmsForm.has_master_key !== undefined">
                        {{ t('Master Key') }}: {{ sseKmsForm.has_master_key ? t('Configured') : t('Not configured') }}
                      </div>
                    </template>
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
                      {{ t('Default Key ID') }}: <span class="italic">{{ t('(Configured)') }}</span>
                    </div>
                    <div v-if="sseKmsForm.kms_status">
                      {{ t('Status') }}:
                      <Badge :variant="kmsStatusVariant" class="text-xs uppercase">
                        {{ getKmsStatusText() }}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 未配置状态 -->
            <div v-else class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-8 text-muted-foreground">
              <Icon name="ri:key-2-line" class="mb-2 text-4xl" />
              <div class="text-sm">{{ t('No KMS configuration found') }}</div>
              <Button size="sm" variant="default" @click="startEditing">
                {{ t('Configure KMS') }}
              </Button>
            </div>
          </div>

          <!-- 编辑模式表单 -->
          <form v-else class="space-y-6" @submit.prevent="saveConfiguration">
          <div>
            <p class="text-sm font-medium text-foreground">{{ t('KMS Type') }}</p>
            <p class="text-xs text-muted-foreground">
              {{ t('HashiCorp Vault Transit Engine') }}
            </p>
          </div>

          <Field>
            <FieldLabel for="kms-address">{{ t('Vault Server Address') }}</FieldLabel>
            <FieldContent>
              <Input id="kms-address" v-model="sseKmsForm.address" :placeholder="t('e.g., https://vault.example.com:8200')" autocomplete="off" />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{{ t('Authentication Method') }}</FieldLabel>
            <FieldContent>
              <RadioGroup v-model="sseKmsForm.auth_type" class="grid gap-3 md:grid-cols-2">
                <label
                  v-for="option in authTypeOptions"
                  :key="option.value"
                  class="flex items-start gap-3 rounded-md border border-border/50 p-3"
                >
                  <RadioGroupItem :value="option.value" class="mt-0.5" />
                  <span class="flex flex-col gap-1">
                    <span class="text-sm font-medium">{{ option.label }}</span>
                    <span v-if="option.description" class="text-xs text-muted-foreground">
                      {{ option.description }}
                    </span>
                  </span>
                </label>
              </RadioGroup>
            </FieldContent>
          </Field>

          <Field v-if="sseKmsForm.auth_type === 'token'">
            <FieldLabel for="kms-token">{{ t('Vault Token') }}</FieldLabel>
            <FieldContent>
              <Input id="kms-token" v-model="sseKmsForm.vault_token" type="password" autocomplete="off" :placeholder="t('Enter your Vault authentication token')" />
            </FieldContent>
            <FieldDescription>
              {{ t('Required: Vault authentication token') }}
            </FieldDescription>
          </Field>

          <div v-if="sseKmsForm.auth_type === 'approle'" class="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel for="kms-role-id">{{ t('Role ID') }}</FieldLabel>
              <FieldContent>
                <Input id="kms-role-id" v-model="sseKmsForm.vault_app_role_id" :placeholder="t('Enter AppRole Role ID')" autocomplete="off" />
              </FieldContent>
              <FieldDescription>
                {{ t('AppRole Role ID from Vault') }}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel for="kms-secret-id">{{ t('Secret ID') }}</FieldLabel>
              <FieldContent>
                <Input id="kms-secret-id" v-model="sseKmsForm.vault_app_role_secret_id" type="password" autocomplete="off" :placeholder="t('Enter AppRole Secret ID')" />
              </FieldContent>
              <FieldDescription>
                {{ t('AppRole Secret ID from Vault') }}
              </FieldDescription>
            </Field>
          </div>

          <Field>
            <FieldLabel for="kms-mount-path">{{ t('Transit Mount Path') }}</FieldLabel>
            <FieldContent>
              <Input id="kms-mount-path" v-model="sseKmsForm.mount_path" :placeholder="t('transit')" autocomplete="off" />
            </FieldContent>
            <FieldDescription>
              {{ t('Transit engine mount path, default: transit') }}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel for="kms-kv-mount">{{ t('KV Mount Path') }}</FieldLabel>
            <FieldContent>
              <Input id="kms-kv-mount" v-model="sseKmsForm.kv_mount" :placeholder="t('secret')" autocomplete="off" />
            </FieldContent>
            <FieldDescription>
              {{ t('KV storage mount path, default: secret') }}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel for="kms-key-prefix">{{ t('Key Path Prefix') }}</FieldLabel>
            <FieldContent>
              <Input id="kms-key-prefix" v-model="sseKmsForm.key_path_prefix" :placeholder="t('rustfs/kms/keys')" autocomplete="off" />
            </FieldContent>
            <FieldDescription>
              {{ t('Key storage path prefix in KV store') }}
            </FieldDescription>
          </Field>

          <div class="grid gap-6 md:grid-cols-2">
            <Field>
              <FieldLabel for="kms-timeout">{{ t('Timeout (seconds)') }}</FieldLabel>
              <FieldContent>
                <Input id="kms-timeout" v-model="sseKmsForm.timeout_seconds" type="number" placeholder="30" />
              </FieldContent>
              <FieldDescription>
                {{ t('Request timeout in seconds, default: 30') }}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel for="kms-retry">{{ t('Retry Attempts') }}</FieldLabel>
              <FieldContent>
                <Input id="kms-retry" v-model="sseKmsForm.retry_attempts" type="number" placeholder="3" />
              </FieldContent>
              <FieldDescription>
                {{ t('Number of retry attempts, default: 3') }}
              </FieldDescription>
            </Field>
          </div>

          <Field>
            <FieldLabel for="kms-default-key">{{ t('Default Key ID') }}</FieldLabel>
            <FieldContent>
              <Input id="kms-default-key" v-model="sseKmsForm.default_key_id" :placeholder="t('rustfs-master')" autocomplete="off" />
            </FieldContent>
            <FieldDescription>
              {{ t('Default master key ID for SSE-KMS') }}
            </FieldDescription>
          </Field>

          <Field orientation="responsive">
            <FieldLabel>{{ t('Enable Cache') }}</FieldLabel>
            <FieldContent>
              <div class="flex items-center justify-between rounded-md border p-3">
                <Switch v-model:checked="sseKmsForm.enable_cache" />
              </div>
            </FieldContent>
            <FieldDescription>
              {{ t('Enable caching for better performance, default: true') }}
            </FieldDescription>
          </Field>

          <Field v-if="sseKmsForm.enable_cache">
            <FieldLabel for="kms-cache-ttl">{{ t('Cache TTL (seconds)') }}</FieldLabel>
            <FieldContent>
              <Input id="kms-cache-ttl" v-model="sseKmsForm.cache_ttl_seconds" type="number" placeholder="600" />
            </FieldContent>
            <FieldDescription>
              {{ t('Cache time-to-live in seconds, default: 600') }}
            </FieldDescription>
          </Field>

          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="cancelEditing">
              {{ t('Cancel') }}
            </Button>
            <Button type="submit" variant="default" :loading="saving">
              {{ t('Save Configuration') }}
            </Button>
          </div>
        </form>
      </CardContent>
      </Card>

      <!-- KMS 密钥列表 -->
      <Card class="shadow-none">
        <CardHeader class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-1">
            <CardTitle>{{ t('KMS Keys Management') }}</CardTitle>
            <CardDescription>
              {{ t('Create, rotate, and inspect the keys managed by your KMS backend.') }}
            </CardDescription>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" :loading="refreshingKeys" :disabled="sseKmsForm.kms_status !== 'Running'" @click="refreshKeyList">
              <Icon name="ri:refresh-line" class="size-4" />
              <span>{{ t('Refresh') }}</span>
            </Button>
            <Button size="sm" variant="default" :disabled="!canAddKeys" @click="showCreateKeyModal = true">
              <Icon name="ri:add-line" class="size-4" />
              <span>{{ t('Create Key') }}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-6">
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
            <div class="flex flex-wrap items-center gap-3">
              <div class="w-4 h-4 rounded-full bg-purple-500"></div>
              <h3 class="text-lg font-medium">{{ t('Master Keys (CMK)') }}</h3>
              <Badge variant="secondary">
                {{
                  kmsKeys.filter(key => !key.key_type || key.key_type === 'master' || key.key_type === 'CMK').length
                }}
              </Badge>
            </div>

            <!-- 主密钥列表 -->
            <div v-if="
              kmsKeys.filter(key => !key.key_type || key.key_type === 'master' || key.key_type === 'CMK').length > 0
            " class="space-y-3">
              <div v-for="key in kmsKeys.filter(
                key => !key.key_type || key.key_type === 'master' || key.key_type === 'CMK'
              )" :key="key.key_id" class="border-l-4 border-purple-500 border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10">
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
                        <Badge :variant="getKeyStatusVariant(key)">
                          {{ getKeyStatusText(key) }}
                        </Badge>
                      </div>
                      <div v-if="key.createdAt">{{ t('Created') }}: {{ formatDate(new Date(key.createdAt)) }}</div>
                      <div v-else-if="key.creation_date">
                        {{ t('Created') }}: {{ formatDate(new Date(key.creation_date)) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" @click="showKeyDetails(key.key_id)">
                      {{ t('Details') }}
                    </Button>
                    <Button size="sm" variant="destructive" :disabled="mapKeyState(key) === 'PendingDeletion'" @click="deleteKeyClick(key)">
                      {{ mapKeyState(key) === 'PendingDeletion' ? t('Deleting...') : t('Delete') }}
                    </Button>
                    <Button v-if="mapKeyState(key) === 'PendingDeletion'" size="sm" variant="destructive" class="bg-destructive/10 text-destructive hover:bg-destructive/20"
                      :disabled="forceDeleting" @click="forceDeleteKeyClick(key)">
                      {{ t('Force Delete') }}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 数据密钥管理区域 -->
          <div v-if="kmsKeys.filter(key => key.key_type === 'data' || key.key_type === 'DEK').length > 0" class="space-y-4 mt-8">
            <div class="flex items-center space-x-3">
              <div class="w-4 h-4 bg-green-500 rounded-full"></div>
              <h3 class="text-lg font-medium">{{ t('Data Keys (DEK)') }}</h3>
              <Badge variant="secondary">
                {{kmsKeys.filter(key => key.key_type === 'data' || key.key_type === 'DEK').length}}
              </Badge>
            </div>

            <!-- 数据密钥说明 -->
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 text-sm">
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
              <div v-for="key in kmsKeys.filter(key => key.key_type === 'data' || key.key_type === 'DEK')" :key="key.key_id"
                class="border-l-4 border-green-500 border rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
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
                        <Badge :variant="getKeyStatusVariant(key)">
                          {{ getKeyStatusText(key) }}
                        </Badge>
                      </div>
                      <div v-if="key.createdAt">{{ t('Created') }}: {{ formatDate(new Date(key.createdAt)) }}</div>
                      <div v-else-if="key.creation_date">
                        {{ t('Created') }}: {{ formatDate(new Date(key.creation_date)) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" @click="showKeyDetails(key.key_id)">
                      {{ t('Details') }}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <EmptyState
            v-if="kmsKeys.length === 0"
            :title="t('No KMS keys found')"
            :description="t('Create your first KMS key to get started')"
            icon="ri:key-2-line"
            class="py-12"
          >
            <Button class="mt-4" :disabled="!canAddKeys" @click="showCreateKeyModal = true">
              {{ t('Create First Key') }}
            </Button>
          </EmptyState>
        </CardContent>
      </Card>

      <!-- Bucket 加密配置管理 -->
      <Card class="mt-6 shadow-none">
        <CardHeader>
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-lg font-semibold">{{ t('Bucket Encryption Management') }}</h3>
            <Button size="sm" :loading="bucketListLoading" @click="refreshBucketList">
              <Icon name="ri:refresh-line" class="size-4" />
              {{ t('Refresh') }}
            </Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- 搜索和排序 -->
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              v-model="bucketSearchQuery"
              :placeholder="t('Search buckets...')"
              clearable
              class="flex-1"
            />
            <Selector
              v-model="bucketSortBy"
              :options="bucketSortOptions"
              :placeholder="t('Sort by')"
              class="w-full sm:w-40"
            />
          </div>

          <!-- Bucket 列表 -->
          <div v-if="filteredBuckets.length > 0" class="space-y-3">
            <div
              v-for="bucket in filteredBuckets"
              :key="bucket.name"
              class="rounded-lg border p-4"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3">
                    <Icon name="ri:folder-3-line" class="text-lg text-blue-500" />
                    <div>
                      <h4 class="text-lg font-medium">{{ bucket.name }}</h4>
                      <div class="text-sm text-gray-500">
                        {{ t('Created') }}: {{ formatDateTime(bucket.creationDate) }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex items-center space-x-4">
                  <!-- 加密状态显示 -->
                  <div class="text-center">
                    <div class="mb-1 text-sm text-gray-500">{{ t('Encryption Status') }}</div>
                    <Badge :variant="bucket.encryptionStatus === 'Enabled' ? 'secondary' : 'outline'">
                      {{
                        bucket.encryptionStatus === 'Enabled'
                          ? bucket.encryptionType === 'SSE-KMS'
                            ? 'SSE-KMS'
                            : 'SSE-S3'
                          : t('Not configured')
                      }}
                    </Badge>
                  </div>

                  <!-- 操作按钮 -->
                  <div class="flex flex-wrap gap-2">
                    <Button size="sm" variant="default" @click="configureBucketEncryption(bucket)">
                      <Icon name="ri:lock-line" class="size-4" />
                      {{ t('Configure') }}
                    </Button>
                    <Button
                      v-if="bucket.encryptionStatus === 'Enabled'"
                      size="sm"
                      variant="destructive"
                      class="bg-destructive/10 text-destructive hover:bg-destructive/20"
                      @click="removeBucketEncryption(bucket)"
                    >
                      <Icon name="ri:lock-unlock-line" class="size-4" />
                      {{ t('Remove') }}
                    </Button>
                  </div>
                </div>
              </div>

              <!-- 加密详细信息 -->
              <div
                v-if="bucket.encryptionStatus === 'Enabled'"
                class="mt-3 rounded border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
              >
                <div class="text-sm">
                  <div>
                    <strong>{{ t('Algorithm') }}:</strong> {{ bucket.encryptionAlgorithm }}
                  </div>
                  <div v-if="bucket.encryptionType === 'SSE-KMS' && bucket.kmsKeyId">
                    <strong>{{ t('KMS Key ID') }}:</strong> {{ bucket.kmsKeyId }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else-if="!bucketListLoading && buckets.length === 0"
            class="py-8 text-center text-gray-500"
          >
            <Icon name="ri:folder-2-line" class="mb-2 mx-auto text-4xl" />
            <div>{{ t('No buckets found') }}</div>
            <div class="text-sm">{{ t('Create your first bucket to configure encryption') }}</div>
          </div>
          <div
            v-else-if="!bucketListLoading && buckets.length > 0 && filteredBuckets.length === 0"
            class="py-8 text-center text-gray-500"
          >
            <Icon name="ri:search-line" class="mb-2 mx-auto text-4xl" />
            <div>{{ t('No buckets match your search') }}</div>
            <div class="text-sm">{{ t('Try adjusting your search terms') }}</div>
          </div>

          <!-- 加载状态 -->
          <div v-if="bucketListLoading" class="py-8 text-center">
            <Spinner class="mx-auto size-6 text-muted-foreground" />
            <div class="mt-2 text-gray-500">{{ t('Loading buckets...') }}</div>
          </div>
        </CardContent>
      </Card>

      <!-- 配置 Bucket 加密模态框 -->
      <Modal v-model="showBucketEncryptModal" :title="selectedBucket
        ? t('Configure Encryption for {bucket}', { bucket: selectedBucket.name })
        : t('Configure Bucket Encryption')
        " size="lg" :close-on-backdrop="false">
        <div class="space-y-4">
          <Field>
            <FieldLabel>{{ t('Encryption Type') }}</FieldLabel>
            <FieldContent>
              <Selector v-model="bucketEncryptForm.encryptionType" :options="bucketEncryptionOptions" :placeholder="t('Select encryption type')" />
            </FieldContent>
            <FieldDescription>
              {{ t('Choose the encryption method for this bucket') }}
            </FieldDescription>
          </Field>

          <Field v-if="bucketEncryptForm.encryptionType === 'SSE-KMS'">
            <FieldLabel>{{ t('KMS Key') }}</FieldLabel>
            <FieldContent class="space-y-1.5">
              <Selector v-model="bucketEncryptForm.kmsKeyId" :options="kmsKeyOptions" :placeholder="t('Select KMS key')" :disabled="kmsKeysLoading" />
              <span v-if="kmsKeysLoading" class="text-xs text-muted-foreground">
                {{ t('Loading keys...') }}
              </span>
            </FieldContent>
            <FieldDescription>
              {{ t('Select the KMS key to use for encryption') }}
            </FieldDescription>
          </Field>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="showBucketEncryptModal = false">
              {{ t('Cancel') }}
            </Button>
            <Button variant="default" :loading="savingBucketEncryption" @click="saveBucketEncryption">
              {{ t('Configure Encryption') }}
            </Button>
          </div>
        </template>
      </Modal>

      <!-- 移除加密确认模态框 -->
      <Modal v-model="showRemoveEncryptModal" :title="t('Confirm Remove Encryption')" size="lg" :close-on-backdrop="false">
        <div class="flex flex-col items-center gap-2 py-4 text-center text-muted-foreground">
          <Icon name="ri:alert-line" class="text-4xl text-orange-500" />
          <div class="text-lg font-medium text-foreground">
            {{ t('Are you sure you want to remove encryption?') }}
          </div>
          <div v-if="selectedBucket" class="text-blue-600 font-medium">
            {{ selectedBucket.name }}
          </div>
          <p>{{ t('Future uploads to this bucket will not be encrypted by default.') }}</p>
          <p>{{ t('Existing encrypted objects will remain encrypted.') }}</p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="showRemoveEncryptModal = false">
              {{ t('Cancel') }}
            </Button>
            <Button variant="destructive" :loading="removingBucketEncryption" @click="confirmRemoveBucketEncryption">
              {{ t('Remove Encryption') }}
            </Button>
          </div>
        </template>
      </Modal>

      <!-- 创建/编辑密钥模态框 -->
      <Modal v-model="showCreateKeyModal" :title="t('Create New Key')" size="lg" :close-on-backdrop="false">
        <div class="space-y-4">
          <Field>
            <FieldLabel>{{ t('Key Name') }}</FieldLabel>
            <FieldContent>
              <Input v-model="keyForm.keyName" :placeholder="t('e.g., app-default')" autocomplete="off" />
            </FieldContent>
            <FieldDescription>
              {{ t('Main key ID (Transit key name). Use business-related readable ID.') }}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{{ t('Algorithm') }}</FieldLabel>
            <FieldContent>
              <Selector v-model="keyForm.algorithm" :options="algorithmOptions" :placeholder="t('Select encryption algorithm')" />
            </FieldContent>
            <FieldDescription>
              {{ t('Encryption algorithm for the key.') }}
            </FieldDescription>
          </Field>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="showCreateKeyModal = false">
              {{ t('Cancel') }}
            </Button>
            <Button variant="default" :loading="savingKey" @click="saveKey">
              {{ t('Create Key') }}
            </Button>
          </div>
        </template>
      </Modal>

      <!-- 删除确认模态框 -->
      <Modal v-model="showDeleteModal" :title="t('Confirm Delete')" size="lg" :close-on-backdrop="false">
        <div class="flex flex-col items-center gap-2 py-4 text-center text-muted-foreground">
          <Icon name="ri:alert-line" class="text-4xl text-red-500" />
          <div class="text-lg font-medium text-foreground">
            {{ t('Are you sure you want to delete this key?') }}
          </div>
          <div v-if="keyToDelete" class="text-blue-600 font-medium">
            {{ getKeyName(keyToDelete) }}
          </div>
          <p>{{ t('This action cannot be undone.') }}</p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="showDeleteModal = false">
              {{ t('Cancel') }}
            </Button>
            <Button variant="destructive" :loading="deletingKey" @click="confirmDeleteKey">
              {{ t('Delete Key') }}
            </Button>
          </div>
        </template>
      </Modal>

      <!-- 强制删除确认模态框 -->
      <Modal v-model="showForceDeleteModal" :title="t('Confirm Force Delete')" size="lg" :close-on-backdrop="false">
        <div class="flex flex-col items-center gap-2 py-4 text-center text-muted-foreground">
          <Icon name="ri:alert-line" class="text-4xl text-red-500" />
          <div class="text-lg font-medium text-foreground">
            {{ t('Are you sure you want to force delete this key?') }}
          </div>
          <div v-if="keyToForceDelete" class="text-blue-600 font-medium">
            {{ getKeyName(keyToForceDelete) }}
          </div>
          <div class="text-red-600 font-semibold">
            {{ t('WARNING: This will immediately delete the key') }}
          </div>
          <p>{{ t('This action cannot be undone and will bypass the normal deletion process.') }}</p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="showForceDeleteModal = false">
              {{ t('Cancel') }}
            </Button>
            <Button variant="destructive" :loading="forceDeleting" @click="confirmForceDeleteKey">
              {{ t('Force Delete') }}
            </Button>
          </div>
        </template>
      </Modal>

      <!-- 详细状态查看模态框 -->
      <Modal v-model="showDetailedStatusModal" :title="t('Detailed KMS Status')" size="lg">
        <div v-if="detailedStatusData" class="space-y-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase text-muted-foreground">{{ t('Backend Type') }}</p>
              <p class="text-sm text-foreground">{{ detailedStatusData.backend_type || 'N/A' }}</p>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase text-muted-foreground">{{ t('Backend Status') }}</p>
              <p class="text-sm text-foreground">{{ detailedStatusData.backend_status || 'N/A' }}</p>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase text-muted-foreground">{{ t('Cache Enabled') }}</p>
              <Badge :variant="detailedStatusData.cache_enabled ? 'secondary' : 'outline'">
                {{ detailedStatusData.cache_enabled ? t('Enabled') : t('Disabled') }}
              </Badge>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase text-muted-foreground">{{ t('Default Key ID') }}</p>
              <p class="text-sm text-foreground">{{ detailedStatusData.default_key_id || 'N/A' }}</p>
            </div>
          </div>

          <div v-if="detailedStatusData.cache_stats" class="space-y-3">
            <h4 class="text-sm font-semibold text-foreground">{{ t('Cache Statistics') }}</h4>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-lg border p-3">
                <p class="text-xs uppercase text-muted-foreground">{{ t('Cache Hits') }}</p>
                <p class="text-lg font-semibold text-foreground">{{ detailedStatusData.cache_stats.hit_count || 0 }}</p>
              </div>
              <div class="rounded-lg border p-3">
                <p class="text-xs uppercase text-muted-foreground">{{ t('Cache Misses') }}</p>
                <p class="text-lg font-semibold text-foreground">{{ detailedStatusData.cache_stats.miss_count || 0 }}</p>
              </div>
              <div class="rounded-lg border p-3">
                <p class="text-xs uppercase text-muted-foreground">{{ t('Hit Rate') }}</p>
                <p class="text-lg font-semibold text-foreground">
                  {{
                    detailedStatusData.cache_stats.hit_count && detailedStatusData.cache_stats.miss_count
                      ? (
                        (detailedStatusData.cache_stats.hit_count /
                          (detailedStatusData.cache_stats.hit_count + detailedStatusData.cache_stats.miss_count)) *
                        100
                      ).toFixed(1) + '%'
                      : 'N/A'
                  }}
                </p>
              </div>
              <div class="rounded-lg border p-3">
                <p class="text-xs uppercase text-muted-foreground">{{ t('Total Requests') }}</p>
                <p class="text-lg font-semibold text-foreground">
                  {{
                    (detailedStatusData.cache_stats.hit_count || 0) + (detailedStatusData.cache_stats.miss_count || 0)
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-6 text-center text-muted-foreground">
          {{ t('No status data available') }}
        </div>

        <template #footer>
          <div class="flex justify-end">
            <Button variant="outline" @click="showDetailedStatusModal = false">
              {{ t('Close') }}
            </Button>
          </div>
        </template>
      </Modal>
    </div>
  </page>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import EmptyState from '@/components/empty-state.vue'
import Selector from '@/components/selector.vue'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { useMessage } from '@/composables/ui'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
} = useSSE()

const { listBuckets, getBucketEncryption, putBucketEncryption, deleteBucketEncryption } = useBucket({})

const { t } = useI18n()
const message = useMessage()

// 状态管理
const isEditing = ref(false)
const saving = ref(false)
const testingConnection = ref(false)
const refreshingStatus = ref(false)
const clearingCache = ref(false)
const showDetailedStatusModal = ref(false)
const startingKMS = ref(false)
const stoppingKMS = ref(false)
const detailedStatusData = ref<any>(null)

const toneToBadgeVariant = (tone: 'success' | 'warning' | 'danger' | 'info' | 'default') => {
  switch (tone) {
    case 'success':
      return 'secondary'
    case 'danger':
      return 'destructive'
    case 'warning':
      return 'outline'
    case 'info':
      return 'secondary'
    default:
      return 'outline'
  }
}

const kmsStatusVariant = computed(() => toneToBadgeVariant(getKmsStatusType()))

// 密钥管理状态
const showCreateKeyModal = ref(false)
const showDeleteModal = ref(false)
const showForceDeleteModal = ref(false)
const savingKey = ref(false)
const deletingKey = ref(false)
const forceDeleting = ref(false)
const refreshingKeys = ref(false)
const keyToDelete = ref<any>(null)
const keyToForceDelete = ref<any>(null)

// 本地密钥名称映射存储
const keyNameMapping = ref<Record<string, string>>({})

// Bucket 加密管理状态
const buckets = ref<any[]>([])
const bucketListLoading = ref(false)
const bucketSearchQuery = ref('')
const bucketSortBy = ref('name')
const showBucketEncryptModal = ref(false)
const showRemoveEncryptModal = ref(false)
const savingBucketEncryption = ref(false)
const removingBucketEncryption = ref(false)
const selectedBucket = ref<any>(null)
const kmsKeysLoading = ref(false)

// 本地存储键名
const KEY_NAME_MAPPING_STORAGE_KEY = 'kms_key_name_mapping'

// 从本地存储加载密钥名称映射
const loadKeyNameMapping = () => {
  try {
    const stored = localStorage.getItem(KEY_NAME_MAPPING_STORAGE_KEY)
    if (stored) {
      keyNameMapping.value = JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to load key name mapping from localStorage:', error)
    keyNameMapping.value = {}
  }
}

// 保存密钥名称映射到本地存储
const saveKeyNameMapping = () => {
  try {
    localStorage.setItem(KEY_NAME_MAPPING_STORAGE_KEY, JSON.stringify(keyNameMapping.value))
  } catch (error) {
    console.warn('Failed to save key name mapping to localStorage:', error)
  }
}

// 设置密钥名称
const setKeyName = (keyId: string, name: string) => {
  keyNameMapping.value[keyId] = name
  saveKeyNameMapping()
}

// 删除密钥名称映射
const removeKeyName = (keyId: string) => {
  delete keyNameMapping.value[keyId]
  saveKeyNameMapping()
}

// 定义KMS状态类型
type KmsStatus = 'Running' | 'Configured' | 'NotConfigured' | string | { Error: string } | null

// 类型守卫函数
const isErrorStatus = (status: KmsStatus): status is { Error: string } => {
  return typeof status === 'object' && status !== null && 'Error' in status
}

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
    type?: string
    address?: string
    mount_path?: string
    kv_mount?: string
    key_path_prefix?: string
    auth_method?: {
      type?: string
      token?: string
      role_id?: string
      secret_id?: string
    }
  } | null, // KMS后端信息
  kms_healthy: false, // KMS健康状态
})

// KMS 密钥列表
const kmsKeys = ref<any[]>([])

// 密钥表单数据
const keyForm = reactive({
  keyName: '',
  algorithm: 'AES-256',
})

// Bucket 加密配置表单
const bucketEncryptForm = reactive({
  encryptionType: '',
  kmsKeyId: '',
})

// Bucket 排序选项
const bucketSortOptions = computed(() => [
  { label: t('Name'), value: 'name' },
  { label: t('Creation Date'), value: 'creationDate' },
])

// Bucket 加密类型选项
const bucketEncryptionOptions = computed(() => [
  { label: 'SSE-S3', value: 'SSE-S3' },
  { label: 'SSE-KMS', value: 'SSE-KMS' },
])

// 算法选项
const algorithmOptions = [
  { label: 'AES-256', value: 'AES-256' },
  { label: 'AES-128', value: 'AES-128' },
  { label: 'RSA-2048', value: 'RSA-2048' },
  { label: 'RSA-4096', value: 'RSA-4096' },
]

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
  )
})

const authTypeOptions = computed(() => [
  {
    label: t('Token'),
    value: 'token',
    description: t('Use Vault token for authentication'),
  },
  {
    label: t('AppRole'),
    value: 'approle',
    description: t('Use AppRole authentication'),
  },
])

// 计算属性：是否可以添加密钥
const canAddKeys = computed(() => {
  // 只有在配置完成且状态为Running且健康时才允许添加密钥
  return hasConfiguration.value && sseKmsForm.kms_status === 'Running' && sseKmsForm.kms_healthy
})

// 计算属性：过滤和排序后的bucket列表
const filteredBuckets = computed(() => {
  let filtered = [...buckets.value]

  // 搜索过滤
  if (bucketSearchQuery.value) {
    const query = bucketSearchQuery.value.toLowerCase()
    filtered = filtered.filter(bucket => bucket.name.toLowerCase().includes(query))
  }

  // 排序
  filtered.sort((a, b) => {
    if (bucketSortBy.value === 'name') {
      return a.name.localeCompare(b.name)
    } else if (bucketSortBy.value === 'creationDate') {
      return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
    }
    return 0
  })

  return filtered
})

// 计算属性：KMS密钥选项（用于bucket加密配置）
const kmsKeyOptions = computed(() => {
  return getMasterKeys().map((key: any) => ({
    label: getKeyName(key),
    value: key.key_id,
  }))
})

// 辅助函数：获取主密钥列表
const getMasterKeys = () => {
  return kmsKeys.value.filter(key => {
    // 判断密钥类型：
    // 1. 如果有key_type字段，则使用该字段
    // 2. 如果没有key_type字段，默认认为是主密钥
    // 3. 如果key_id以特定前缀开头，可能是数据密钥
    return !key.key_type || key.key_type === 'master' || key.key_type === 'CMK'
  })
}

// 辅助函数：获取数据密钥列表
const getDataKeys = () => {
  return kmsKeys.value.filter(key => {
    return key.key_type === 'data' || key.key_type === 'DEK'
  })
}

// 辅助函数：判断密钥类型
const getKeyType = (key: any) => {
  if (key.key_type === 'data' || key.key_type === 'DEK') {
    return 'data'
  }
  return 'master'
}

// 辅助函数：获取密钥名称
const getKeyName = (key: any) => {
  // 优先从后端的 description 字段获取名称（持久化的）
  if (key.description) {
    return key.description
  }

  // 然后从 metadata 或 tags 中获取名称
  // 优先使用 tags.name（新的标准格式），fallback 到 metadata.name（向后兼容）
  const name = key.tags?.name || key.metadata?.name
  if (name) {
    return name
  }

  // 从本地存储的映射中获取名称（临时的，向后兼容）
  const localName = keyNameMapping.value[key.key_id]
  if (localName) {
    return localName
  }

  // 最后显示密钥ID的前8位
  return key.key_id ? `Key-${key.key_id.substring(0, 8)}` : 'Unnamed Key'
}

// 辅助函数：获取密钥类型显示名称
const getKeyTypeName = (key: any) => {
  const type = getKeyType(key)
  return type === 'data' ? t('Data Key (DEK)') : t('Master Key (CMK)')
}

// 辅助函数：获取密钥类型颜色
const getKeyTypeColor = (key: any) => {
  const type = getKeyType(key)
  return type === 'data' ? 'green' : 'purple'
}

// 方法
const getKmsStatusType = () => {
  if (!hasConfiguration.value) return 'default'

  // 处理Error状态（可能是对象格式）
  if (isErrorStatus(sseKmsForm.kms_status)) {
    return 'danger'
  }

  // 根据KMS状态返回不同的标签类型
  switch (sseKmsForm.kms_status) {
    case 'Running':
      return sseKmsForm.kms_healthy ? 'success' : 'warning'
    case 'Configured':
      return 'info'
    case 'Stopped':
      return 'warning'
    case 'Error':
      return 'danger'
    case 'NotConfigured':
      return 'default'
    default:
      return 'default'
  }
}

const getKmsStatusText = () => {
  if (!hasConfiguration.value) return t('Not Configured')

  // 根据KMS状态返回不同的状态文本
  // 注意：后端的Error状态是 Error(String) 格式，会被序列化为对象
  if (isErrorStatus(sseKmsForm.kms_status)) {
    return t('Error')
  }

  switch (sseKmsForm.kms_status) {
    case 'Running':
      return sseKmsForm.kms_healthy ? t('Running') : t('Running (Unhealthy)')
    case 'Configured':
      return t('Configured')
    case 'NotConfigured':
      return t('Not Configured')
    default:
      return t('Unknown')
  }
}

const getKmsStatusDescription = () => {
  if (!hasConfiguration.value) return t('KMS server is not configured')

  // 处理Error状态（可能是对象格式）
  if (isErrorStatus(sseKmsForm.kms_status)) {
    return t('KMS server has errors') + ': ' + sseKmsForm.kms_status.Error
  }

  // 根据KMS状态返回不同的描述
  switch (sseKmsForm.kms_status) {
    case 'Running':
      // 如果KMS运行但配置详情为空，说明是配置详情不可见的状态
      if (sseKmsForm.kms_healthy && (!sseKmsForm.address || sseKmsForm.address === 'configured-but-hidden')) {
        return t('KMS server is running, configuration details are private')
      }
      return sseKmsForm.kms_healthy ? t('KMS server is running and healthy') : t('KMS server is running but unhealthy')
    case 'Configured':
      return t('KMS server is configured but not running')
    case 'NotConfigured':
      return t('KMS server is not configured')
    default:
      return t('KMS server status unknown')
  }
}

// 将后端的 key_state 映射到前端期望的状态值
const mapKeyState = (key: any) => {
  // 后端使用 key_state 字段，前端使用 status 字段
  const keyState = key.key_state || key.status

  switch (keyState) {
    case 'Enabled':
      return 'Active'
    case 'Disabled':
      return 'Disabled'
    case 'PendingDeletion':
      return 'PendingDeletion'
    case 'Unavailable':
      return 'Inactive'
    default:
      return keyState
  }
}

// 获取密钥状态标签类型
const getKeyStatusTone = (key: any) => {
  const status = mapKeyState(key)
  switch (status) {
    case 'Active':
      return 'success'
    case 'Inactive':
      return 'default'
    case 'PendingDeletion':
      return 'warning'
    case 'Disabled':
      return 'default'
    default:
      return 'default'
  }
}

const getKeyStatusVariant = (key: any) => toneToBadgeVariant(getKeyStatusTone(key))

// 获取密钥状态显示文本
const getKeyStatusText = (key: any) => {
  const status = mapKeyState(key)
  switch (status) {
    case 'Active':
      return t('Active')
    case 'Inactive':
      return t('Inactive')
    case 'PendingDeletion':
      return t('Pending Deletion')
    case 'Disabled':
      return t('Disabled')
    default:
      return status
  }
}

const getKmsTypeName = (kmsType: string) => {
  const names: Record<string, string> = {
    vault: t('HashiCorp Vault Transit Engine'),
  }
  return names[kmsType] || kmsType
}

// 获取认证方式显示名称
const getAuthMethodName = () => {
  // 从 KMS 后端信息中获取认证方式
  if (sseKmsForm.kms_backend && sseKmsForm.kms_backend.auth_method) {
    if (sseKmsForm.kms_backend.auth_method.type === 'token') {
      return t('Token')
    } else if (sseKmsForm.kms_backend.auth_method.type === 'approle') {
      return t('AppRole')
    }
  }
  return t('Not configured')
}

const showKeyDetails = async (keyId: string) => {
  try {
    const keyDetails = await getKeyDetails(keyId)
    // 可以在这里显示密钥详情模态框，或者跳转到详情页面
    message.info(`Key Details: ${JSON.stringify(keyDetails, null, 2)}`)
  } catch (error) {
    message.error(t('Failed to get key details'))
  }
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// KMS配置编辑方法
const startEditing = () => {
  // 如果是首次编辑，默认选中Vault
  if (!sseKmsForm.backend_type) {
    sseKmsForm.backend_type = 'vault'
  }
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
  // 重置表单到当前配置
  loadKMSStatus()
}

// 统一的KMS状态和配置获取方法
const loadKMSStatus = async () => {
  try {
    // 先获取KMS服务状态
    const statusResponse = await getKMSStatus()
    console.log('KMS Status Response:', statusResponse) // 临时调试日志

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
      })
      isEditing.value = true
      message.info(t('KMS is not configured, please configure it first'))
      return
    }

    // 如果服务已配置，更新状态信息
    sseKmsForm.kms_status = statusResponse.status
    sseKmsForm.kms_healthy = statusResponse.healthy

    // 如果服务状态不是运行中，显示相应信息但不获取配置
    if (statusResponse.status !== 'Running') {
      if (statusResponse.status === 'Stopped') {
        message.warning(t('KMS service is stopped'))
      } else if (statusResponse.status === 'Error') {
        message.error(t('KMS service has errors'))
      }
      // 仍然尝试获取配置以显示当前设置
    }

    // 直接从状态响应中获取配置信息
    if (statusResponse.config_summary) {
      const configResponse = statusResponse.config_summary
      console.log('Config Summary from Status:', configResponse) // 临时调试日志
      console.log('Config Summary Type:', typeof configResponse)
      console.log('Config Summary Keys:', Object.keys(configResponse || {}))
      if (configResponse.backend_summary) {
        console.log('Backend Summary:', configResponse.backend_summary)
        console.log('Backend Summary Keys:', Object.keys(configResponse.backend_summary))
        if (configResponse.backend_summary.backend_type === 'vault') {
          console.log('Vault Config:', configResponse.backend_summary)
          console.log('Vault Address:', configResponse.backend_summary.address)
        }
      } else {
        console.log('No backend_summary found in config_summary')
      }

      Object.assign(sseKmsForm, {
        backend_type: configResponse.backend_type?.toLowerCase() || 'vault',
        default_key_id: configResponse.default_key_id || '',
        enable_cache: configResponse.enable_cache !== undefined ? configResponse.enable_cache : true,
        timeout_seconds: configResponse.timeout_seconds || 30,
        retry_attempts: configResponse.retry_attempts || 3,
      })

      // 处理缓存配置
      if (configResponse.cache_summary) {
        sseKmsForm.cache_ttl_seconds = configResponse.cache_summary.ttl_seconds || 300
      }

      // 根据backend_summary提取后端特定配置
      if (configResponse.backend_summary) {
        if (configResponse.backend_summary.backend_type === 'vault') {
          // Vault后端配置
          const vaultConfig = configResponse.backend_summary
          Object.assign(sseKmsForm, {
            address: vaultConfig.address || '',
            mount_path: vaultConfig.mount_path || 'transit',
            kv_mount: vaultConfig.kv_mount || 'secret',
            key_path_prefix: vaultConfig.key_path_prefix || 'rustfs/kms/keys',
          })

          // 设置认证方式（基于auth_method_type推断）
          sseKmsForm.auth_type = vaultConfig.auth_method_type === 'approle' ? 'approle' : 'token'
          sseKmsForm.vault_token = '***' // 显示掩码表示已配置
          sseKmsForm.vault_app_role_id = ''
          sseKmsForm.vault_app_role_secret_id = ''
        } else if (configResponse.backend_summary.backend_type === 'local') {
          // Local后端配置
          const localConfig = configResponse.backend_summary
          Object.assign(sseKmsForm, {
            key_directory: localConfig.key_dir || '',
            has_master_key: localConfig.has_master_key || false,
            file_permissions: localConfig.file_permissions,
          })
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
      }

      message.success(t('Configuration loaded successfully'))
    } else {
      // 如果没有配置信息，但状态服务正常，说明KMS已配置但详情不可见
      console.log('No config_summary in status response, KMS may be configured but details are private')
      sseKmsForm.backend_type = statusResponse.backend_type?.toLowerCase() || 'vault'
      sseKmsForm.default_key_id = 'configured-but-hidden' // 设置一个标识表示已配置
      sseKmsForm.address = 'configured-but-hidden'

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
      }
    }
  } catch (error) {
    console.error('Failed to load KMS status:', error)

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
      })
      isEditing.value = true
      message.info(t('KMS service not initialized, please configure it first'))
    } else {
      // 其他错误，进入编辑模式
      isEditing.value = true
      message.error(t('Failed to load KMS status'))
    }
  }
}

// 加载密钥列表
const loadKeyList = async () => {
  try {
    const response = await getKeyList()
    console.log('Key List Response:', response) // 调试日志
    console.log('Key List Response Type:', typeof response)
    console.log('Key List Response Keys:', Object.keys(response || {}))

    // 适配新的API响应格式
    if (response && response.success !== false) {
      kmsKeys.value = response.keys || []
      console.log('Loaded keys:', kmsKeys.value.length)
    } else {
      console.log('Key list failed:', response)
      message.warning(response?.message || t('Failed to load key list'))
      kmsKeys.value = []
    }
  } catch (error) {
    console.error('Failed to load key list:', error)
    console.error('Error details:', {
      message: (error as any)?.message,
      status: (error as any)?.status,
      response: (error as any)?.response,
    })
    message.error(t('Failed to load key list'))
    kmsKeys.value = []
  }
}

// 刷新密钥列表
const refreshKeyList = async () => {
  try {
    refreshingKeys.value = true
    await loadKeyList()
    message.success(t('Key list refreshed'))
  } catch (error) {
    console.error('Failed to refresh key list:', error)
    message.error(t('Failed to refresh key list'))
  } finally {
    refreshingKeys.value = false
  }
}

// 设置为本地开发
const setLocalDevelopment = async () => {
  try {
    await configureKMS({
      kms_type: 'local',
    })

    message.success(t('Local development mode set successfully'))

    // 重新加载配置状态
    await loadKMSStatus()
  } catch (error) {
    message.error(t('Failed to set local development mode'))
  }
}
// setLocalDevelopment();

const validateSseKmsForm = () => {
  if (!sseKmsForm.address || !String(sseKmsForm.address).trim()) {
    message.error(t('Please enter Vault server address'))
    return false
  }

  if (!sseKmsForm.default_key_id || !String(sseKmsForm.default_key_id).trim()) {
    message.error(t('Please enter default key ID'))
    return false
  }

  if (sseKmsForm.auth_type === 'token' && (!sseKmsForm.vault_token || !String(sseKmsForm.vault_token).trim())) {
    message.error(t('Please enter Vault token'))
    return false
  }

  if (
    sseKmsForm.auth_type === 'approle' &&
    (!sseKmsForm.vault_app_role_id ||
      !String(sseKmsForm.vault_app_role_id).trim() ||
      !sseKmsForm.vault_app_role_secret_id ||
      !String(sseKmsForm.vault_app_role_secret_id).trim())
  ) {
    message.error(t('Please enter both Role ID and Secret ID'))
    return false
  }

  return true
}

const validateKeyForm = () => {
  if (!keyForm.keyName || !keyForm.keyName.toString().trim()) {
    message.error(t('Please enter key name'))
    return false
  }
  return true
}

const validateBucketEncryptForm = () => {
  if (!bucketEncryptForm.encryptionType) {
    message.error(t('Please select encryption type'))
    return false
  }

  if (bucketEncryptForm.encryptionType === 'SSE-KMS' && !bucketEncryptForm.kmsKeyId) {
    message.error(t('Please select a KMS key for SSE-KMS encryption'))
    return false
  }

  if (!selectedBucket.value) {
    message.error(t('No bucket selected'))
    return false
  }

  return true
}

const saveConfiguration = async () => {
  if (!validateSseKmsForm()) {
    return
  }

  try {
    saving.value = true

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
    }

    // 根据选择的认证方式添加相应的字段
    if (sseKmsForm.auth_type === 'token') {
      if (sseKmsForm.vault_token && sseKmsForm.vault_token !== '***') {
        // Token 认证方式
        configData.auth_method = {
          token: sseKmsForm.vault_token,
        }
      } else if (sseKmsForm.vault_token === '***') {
        // 如果显示的是掩码，说明已经有配置，不需要重新设置认证信息
        delete configData.auth_method
      } else {
        message.error(t('Please enter Vault token'))
        return
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
        }
      } else if (sseKmsForm.vault_app_role_id === '***' || sseKmsForm.vault_app_role_secret_id === '***') {
        // 如果显示的是掩码，说明已经有配置，不需要重新设置认证信息
        delete configData.auth_method
      } else {
        message.error(t('Please enter both Role ID and Secret ID'))
        return
      }
    } else {
      message.error(t('Please select authentication method'))
      return
    }

    const response = await configureKMS(configData)

    // 处理配置响应，更新KMS状态
    if (response && response.status) {
      sseKmsForm.kms_status = response.status
      // 如果配置成功，假设服务健康
      if (response.success !== false) {
        sseKmsForm.kms_healthy = true
      }
    }

    // 更新显示的配置信息（保留用户刚刚输入的值）
    // 这样用户可以看到他们刚刚保存的配置
    if (configData.address) {
      sseKmsForm.address = configData.address
    }

    message.success(t('Configuration saved successfully'))
    isEditing.value = false
    loadKMSStatus()
  } catch (error) {
    console.error('KMS Configuration save error:', error)
    let errorMessage = t('Failed to save configuration')

    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage += `: ${error.message}`
    } else if (error && typeof error === 'object' && 'response' in error) {
      const response = error.response as any
      if (response?.data?.message) {
        errorMessage += `: ${response.data.message}`
      } else if (response?.statusText) {
        errorMessage += `: ${response.statusText}`
      }
    } else if (typeof error === 'string') {
      errorMessage += `: ${error}`
    }

    message.error(errorMessage)
  } finally {
    saving.value = false
  }
}

const deleteKeyClick = (key: any) => {
  // 如果密钥已经在删除中，显示提示
  if (mapKeyState(key) === 'PendingDeletion') {
    message.info(t('Key is already pending deletion'))
    return
  }

  keyToDelete.value = key
  showDeleteModal.value = true
}

const forceDeleteKeyClick = (key: any) => {
  keyToForceDelete.value = key
  showForceDeleteModal.value = true
}

const saveKey = async () => {
  if (!validateKeyForm()) {
    return
  }

  try {
    savingKey.value = true

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
    }

    console.log('Creating key with data:', createKeyData)
    const response = await createKey(createKeyData)
    console.log('Create key response:', response)

    // 密钥名称已通过 description 字段保存到后端，无需额外处理

    message.success(t('Key created successfully'))
    showCreateKeyModal.value = false

    // 重置表单
    Object.assign(keyForm, {
      keyName: '',
      algorithm: 'AES-256',
    })

    // 重新加载密钥列表
    await loadKeyList()
  } catch (error) {
    message.error(t('Failed to save key'))
  } finally {
    savingKey.value = false
  }
}

const confirmDeleteKey = async () => {
  try {
    deletingKey.value = true

    // 调用API删除密钥 - 适配新的参数格式
    await deleteKey(keyToDelete.value.key_id)

    // 密钥删除后，名称信息也随之从后端删除

    message.success(t('Key deleted successfully'))

    showDeleteModal.value = false
    keyToDelete.value = null

    // 重新加载密钥列表
    await loadKeyList()
  } catch (error) {
    message.error(t('Failed to delete key'))
  } finally {
    deletingKey.value = false
  }
}

const confirmForceDeleteKey = async () => {
  try {
    forceDeleting.value = true

    // 调用强制删除API
    await forceDeleteKey(keyToForceDelete.value.key_id)

    message.success(t('Key force deleted successfully'))
    showForceDeleteModal.value = false
    keyToForceDelete.value = null

    // 重新加载密钥列表
    await loadKeyList()
  } catch (error) {
    message.error(t('Failed to force delete key'))
  } finally {
    forceDeleting.value = false
  }
}

// 新增功能方法
const refreshStatus = async () => {
  try {
    refreshingStatus.value = true
    await loadKMSStatus()
    message.success(t('Status refreshed successfully'))
  } catch (error) {
    message.error(t('Failed to refresh status'))
  } finally {
    refreshingStatus.value = false
  }
}

const clearKMSCache = async () => {
  try {
    clearingCache.value = true
    const result = await clearCache()
    if (result.status === 'success') {
      message.success(t('Cache cleared successfully'))
    } else {
      message.warning(result.message || t('Cache clear completed with warnings'))
    }
  } catch (error) {
    message.error(t('Failed to clear cache'))
  } finally {
    clearingCache.value = false
  }
}

const viewDetailedStatus = async () => {
  try {
    const detailedStatus = await getDetailedStatus()
    detailedStatusData.value = detailedStatus
    showDetailedStatusModal.value = true
  } catch (error) {
    message.error(t('Failed to get detailed status'))
  }
}

// 监听 KMS 类型变化，重置 vault 字段为默认值
watch(
  () => sseKmsForm.backend_type,
  newValue => {
    if (newValue === 'vault') {
      // 切换到 vault 类型时，重置 vault 字段为默认值
      sseKmsForm.mount_path = 'transit'
      sseKmsForm.timeout_seconds = 30
    }
  }
)

// 启动KMS服务
const startKMSService = async () => {
  try {
    startingKMS.value = true
    const response = await startKMS()

    if (response && response.success) {
      message.success(t('KMS service started successfully'))
      sseKmsForm.kms_status = response.status
      await loadKMSStatus()

      // 刷新密钥列表
      await loadKeyList()
    } else {
      message.error(t('Failed to start KMS service') + ': ' + (response?.message || 'Unknown error'))
    }
  } catch (error) {
    console.error('Failed to start KMS service:', error)
    message.error(t('Failed to start KMS service'))
  } finally {
    startingKMS.value = false
  }
}

// 停止KMS服务
const stopKMSService = async () => {
  try {
    stoppingKMS.value = true
    const response = await stopKMS()

    if (response && response.success) {
      message.success(t('KMS service stopped successfully'))
      sseKmsForm.kms_status = response.status
      await loadKMSStatus()
    } else {
      message.error(t('Failed to stop KMS service') + ': ' + (response?.message || 'Unknown error'))
    }
  } catch (error) {
    console.error('Failed to stop KMS service:', error)
    message.error(t('Failed to stop KMS service'))
  } finally {
    stoppingKMS.value = false
  }
}

// =========================
// Bucket 加密管理相关方法
// =========================

// 加载bucket列表
const loadBucketList = async () => {
  bucketListLoading.value = true
  try {
    const response = await listBuckets()
    if (response && response.Buckets) {
      // 并行获取每个bucket的加密配置
      const bucketList = await Promise.all(
        response.Buckets.map(async (bucket: any) => {
          try {
            const encryptionConfig = await getBucketEncryption(bucket.Name)

            let encryptionStatus = 'Disabled'
            let encryptionType = ''
            let encryptionAlgorithm = ''
            let kmsKeyId = ''

            const rules = encryptionConfig?.ServerSideEncryptionConfiguration?.Rules ?? []
            const rule = rules[0]

            if (rule?.ApplyServerSideEncryptionByDefault) {
              encryptionStatus = 'Enabled'
              const algorithm = rule.ApplyServerSideEncryptionByDefault.SSEAlgorithm

              if (algorithm === 'aws:kms') {
                encryptionType = 'SSE-KMS'
                encryptionAlgorithm = 'AES-256 (KMS)'
                kmsKeyId = rule.ApplyServerSideEncryptionByDefault.KMSMasterKeyID || ''
              } else if (algorithm === 'AES256') {
                encryptionType = 'SSE-S3'
                encryptionAlgorithm = 'AES-256 (S3)'
              }
            }

            return {
              name: bucket.Name ?? '',
              creationDate: bucket.CreationDate,
              encryptionStatus,
              encryptionType,
              encryptionAlgorithm,
              kmsKeyId,
            }
          } catch (error) {
            // 如果获取加密配置失败（如404），则认为未配置加密
            return {
              name: bucket.Name ?? '',
              creationDate: bucket.CreationDate,
              encryptionStatus: 'Disabled',
              encryptionType: '',
              encryptionAlgorithm: '',
              kmsKeyId: '',
            }
          }
        })
      )

      buckets.value = bucketList
    }
  } catch (error) {
    console.error('Failed to load bucket list:', error)
    message.error(t('Failed to load bucket list'))
  } finally {
    bucketListLoading.value = false
  }
}

// 刷新bucket列表
const refreshBucketList = async () => {
  await loadBucketList()
  message.success(t('Bucket list refreshed'))
}

// 配置bucket加密
const configureBucketEncryption = (bucket: any) => {
  selectedBucket.value = bucket

  // 初始化表单数据
  if (bucket.encryptionStatus === 'Enabled') {
    bucketEncryptForm.encryptionType = bucket.encryptionType
    bucketEncryptForm.kmsKeyId = bucket.kmsKeyId || ''
  } else {
    bucketEncryptForm.encryptionType = ''
    bucketEncryptForm.kmsKeyId = ''
  }

  showBucketEncryptModal.value = true
}

// 移除bucket加密
const removeBucketEncryption = (bucket: any) => {
  selectedBucket.value = bucket
  showRemoveEncryptModal.value = true
}

// 保存bucket加密配置
const saveBucketEncryption = async () => {
  if (!validateBucketEncryptForm()) {
    return
  }

  try {
    savingBucketEncryption.value = true

    const encryptionConfig: any = {
      Rules: [
        {
          ApplyServerSideEncryptionByDefault: {},
        },
      ],
    }

    if (bucketEncryptForm.encryptionType === 'SSE-KMS') {
      encryptionConfig.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm = 'aws:kms'
      encryptionConfig.Rules[0].ApplyServerSideEncryptionByDefault.KMSMasterKeyID = bucketEncryptForm.kmsKeyId
    } else if (bucketEncryptForm.encryptionType === 'SSE-S3') {
      encryptionConfig.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm = 'AES256'
    }

    await putBucketEncryption(selectedBucket.value.name, encryptionConfig)

    message.success(t('Bucket encryption configured successfully'))
    showBucketEncryptModal.value = false

    // 刷新bucket列表
    await loadBucketList()
  } catch (error: any) {
    console.error('Failed to configure bucket encryption:', error)
    message.error(t('Failed to configure bucket encryption') + ': ' + error.message)
  } finally {
    savingBucketEncryption.value = false
  }
}

// 确认移除bucket加密
const confirmRemoveBucketEncryption = async () => {
  if (!selectedBucket.value) {
    message.error(t('No bucket selected'))
    return
  }

  removingBucketEncryption.value = true
  try {
    await deleteBucketEncryption(selectedBucket.value.name)
    message.success(t('Bucket encryption removed successfully'))
    showRemoveEncryptModal.value = false

    // 刷新bucket列表
    await loadBucketList()
  } catch (error: any) {
    console.error('Failed to remove bucket encryption:', error)
    message.error(t('Failed to remove bucket encryption') + ': ' + error.message)
  } finally {
    removingBucketEncryption.value = false
  }
}

// 格式化日期时间
const formatDateTime = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleString()
  } catch (error) {
    return dateString
  }
}

// 页面加载时获取当前配置和密钥列表
onMounted(async () => {
  await loadKMSStatus()

  // 只有在KMS配置正确且状态为Running时才加载密钥列表
  if (sseKmsForm.kms_status === 'Running' && sseKmsForm.kms_healthy) {
    await loadKeyList()
  }

  // 加载bucket列表
  await loadBucketList()
})
</script>

<style scoped>
.sticky {
  position: sticky;
}
</style>
