<script lang="ts" setup>
await setPageLayout('plain')

import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { configManager } from '~/utils/config'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const method = ref('accessKeyAndSecretKey')
const accessKeyAndSecretKey = ref({
  accessKeyId: '',
  secretAccessKey: '',
})

const sts = ref({
  accessKeyId: '',
  secretAccessKey: '',
  sessionToken: '',
})

// 服务端配置
const serverConfig = ref({
  protocol: 'http',
  host: 'localhost',
  port: '9000',
  region: 'us-east-1'
})

const message = useMessage()
const auth = useAuth()

// 控制服务器配置折叠面板展开
const expandedNames = ref<string[]>([])
// 警告提示内容
const configAlert = ref('')

// 检查是否需要默认展开服务器配置
onMounted(async () => {
  // 使用 configManager 加载配置（按优先级：config.json > localStorage > 默认值）
  const config = await configManager.loadConfig()
  if (config) {
    const serverConfigData = configManager.extractServerConfig(config)
    if (serverConfigData) {
      // 更新 serverConfig
      serverConfig.value = serverConfigData

      // 更新 serverUrl
      serverUrl.value = `${serverConfigData.protocol}://${serverConfigData.host}:${serverConfigData.port}`
    }
  }

  // 如果没有有效配置，设置默认 serverUrl
  if (!serverUrl.value) {
    serverUrl.value = `${serverConfig.value.protocol}://${serverConfig.value.host}:${serverConfig.value.port}`
  }

  if (route.query.showConfig === '1') {
    expandedNames.value = ['server-config']
    configAlert.value = t('No valid server configuration detected, please check server configuration')
  }
})

const handleLogin = async () => {
  // 验证并解析URL
  validateAndParseUrl()
  if (urlValidationStatus.value === 'error') {
    expandedNames.value = ['server-config']
    return
  }

  const credentials = method.value === 'accessKeyAndSecretKey' ? accessKeyAndSecretKey.value : sts.value

  try {
    // 使用 configManager 保存配置（如果有 public/config.json 则不保存）
    const saved = await configManager.saveConfig({
      protocol: serverConfig.value.protocol,
      host: serverConfig.value.host,
      port: serverConfig.value.port,
      region: serverConfig.value.region
    })

    if (saved) {
      message.success(t('Server configuration saved'))
    }

    await auth.login(credentials)
    message.success(t('Login Success'))
    window.location.href = '/'
  } catch (error) {
    expandedNames.value = ['server-config']
    configAlert.value = t('Login failed, please check server configuration')
    message.error(t('Login Failed'))
  }
}

const serverUrl = ref('')
const urlValidationStatus = ref<'success' | 'warning' | 'error' | undefined>(undefined)
const urlError = ref('')

const validateAndParseUrl = () => {
  const url = serverUrl.value.trim()

  if (!url) {
    urlValidationStatus.value = 'error'
    urlError.value = t('Server URL is required')
    return
  }

  try {
    const urlObj = new URL(url)

    // 验证协议
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      urlValidationStatus.value = 'error'
      urlError.value = t('Only HTTP and HTTPS protocols are supported')
      return
    }

    // 验证主机
    if (!urlObj.hostname) {
      urlValidationStatus.value = 'error'
      urlError.value = t('Invalid hostname')
      return
    }

    // 解析并更新配置
    serverConfig.value.protocol = urlObj.protocol.replace(':', '')
    serverConfig.value.host = urlObj.hostname
    serverConfig.value.port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80')

    urlValidationStatus.value = 'success'
    urlError.value = ''
  } catch (error) {
    urlValidationStatus.value = 'error'
    urlError.value = t('Invalid URL format')
  }
}

const onUrlInput = () => {
  // 清除之前的错误状态
  if (urlValidationStatus.value === 'error') {
    urlValidationStatus.value = undefined
    urlError.value = ''
  }
}
</script>

<template>
  <div class="lg:p-20 flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-neutral-800">
    <img src="~/assets/backgrounds/scillate.svg" class="absolute inset-0 z-0 opacity-45" alt="" />
    <div class="flex-1 flex w-full z-10 max-w-7xl lg:max-h-[85vh] shadow-lg rounded-lg overflow-hidden mx-auto dark:bg-neutral-800 dark:border-neutral-700">
      <div class="hidden lg:block w-1/2">
        <auth-heros-static></auth-heros-static>
      </div>
      <div class="w-full lg:w-1/2 flex flex-col justify-center items-center bg-white dark:bg-neutral-900 dark:border-neutral-700 relative">
        <div class="max-w-sm w-full p-4 sm:p-7">
          <img src="https://rustfs.com/rustfs.logo.svg" class="max-w-28" alt="" />
          <div class="py-6">
            <h1 class="block text-2xl font-bold text-gray-800 dark:text-white">{{ t('Login to RustFS Console') }}</h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              {{ t('Welcome back!') }} <br>
              <!-- 请登录账号 -->
            </p>
          </div>

          <div class="mt-5 space-y-4">
            <!-- 服务器配置折叠面板 -->
            <div class="mb-2">
              <div class="transition-all duration-300 ease-in-out">
                <!-- 折叠时的卡片 -->
                <div v-if="!expandedNames.includes('server-config')" @click="expandedNames = ['server-config']" class="w-full cursor-pointer">
                  <div
                    class="rounded border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-4 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors">
                    <div class="truncate">
                      <span class="font-mono text-sm">{{ serverConfig.protocol }}://{{ serverConfig.host }}:{{ serverConfig.port }}</span>
                      <span class="ml-2 text-xs text-gray-500">{{ serverConfig.region }}</span>
                    </div>
                    <Icon :size="18" name="ri:arrow-right-s-fill" class="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-all duration-200" />
                  </div>
                </div>

                <!-- 展开时的内容 -->
                <div v-else class="border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <!-- 标题栏 -->
                  <div @click="expandedNames = []"
                    class="w-full cursor-pointer flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors border-b border-gray-200 dark:border-neutral-700">
                    <span class="flex items-center text-sm font-medium">
                      <Icon :size="16" name="ri:settings-3-line" class="mr-2 text-gray-500" />
                      {{ t('Server Configuration') }}
                    </span>
                    <Icon :size="18" name="ri:arrow-down-s-fill" class="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-all duration-200 transform" />
                  </div>

                  <!-- 配置表单 -->
                  <div class="p-4 bg-white dark:bg-neutral-900">
                    <div v-if="configAlert"
                      class="mb-4 px-3 py-2 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm">
                      {{ configAlert }}
                    </div>

                    <div class="space-y-4">
                      <div>
                        <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{{ t('Server URL') }}</label>
                        <n-input v-model:value="serverUrl" size="medium" type="text" :placeholder="'http://localhost:9000'" :status="urlValidationStatus"
                          @blur="validateAndParseUrl" @input="onUrlInput" />
                        <div v-if="urlError" class="mt-1 text-xs text-red-500">{{ urlError }}</div>
                      </div>

                      <div>
                        <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{{ t('Region') }}</label>
                        <n-input v-model:value="serverConfig.region" size="medium" type="text" :placeholder="'us-east-1'" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <n-tabs type="segment" animated size="small" v-model:value="method">
              <n-tab-pane name="accessKeyAndSecretKey" :label="t('Key Login')" />
              <n-tab-pane name="sts" :label="t('STS Login')" />
            </n-tabs>

            <!-- Form -->
            <form @submit.prevent="handleLogin" autocomplete="off">
              <div class="grid gap-y-6">
                <template v-if="method == 'accessKeyAndSecretKey'">
                  <div>
                    <label for="accessKey" class="block text-sm mb-2 dark:text-white">{{ t('Account') }}</label>
                    <n-input v-model:value="accessKeyAndSecretKey.accessKeyId" autocomplete="new-password" type="text" :placeholder="t('Please enter account')" />
                  </div>
                  <div>
                    <div class="flex justify-between items-center">
                      <label for="secretKey" class="block text-sm mb-2 dark:text-white">{{ t('Key') }}</label>
                    </div>
                    <n-input v-model:value="accessKeyAndSecretKey.secretAccessKey" autocomplete="new-password" type="password" :placeholder="t('Please enter key')" />
                  </div>
                </template>

                <template v-else>
                  <div>
                    <label for="accessKey" class="block text-sm mb-2 dark:text-white">{{ t('STS Username') }}</label>
                    <n-input v-model:value="sts.accessKeyId" autocomplete="new-password" type="text" :placeholder="t('Please enter STS username')" />
                  </div>
                  <div>
                    <label for="sts.secretAccessKey" class="block text-sm mb-2 dark:text-white">{{ t('STS Key') }}</label>
                    <n-input v-model:value="sts.secretAccessKey" autocomplete="new-password" type="password" :placeholder="t('Please enter STS key')" />
                  </div>
                  <div>
                    <label for="sessionToken" class="block text-sm mb-2 dark:text-white">{{ t('STS Session Token') }}</label>
                    <n-input v-model:value="sts.sessionToken" autocomplete="new-password" type="text" :placeholder="t('Please enter STS session token')" />
                  </div>
                </template>

                <button type="submit"
                  class="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">
                  {{ t('Login') }}
                </button>
              </div>
            </form>
            <!-- End Form -->
          </div>

          <div class="my-8">
            <p class="text-sm text-gray-600 dark:text-neutral-400">
              {{ t('Login Problems?') }} <nuxt-link to="https://www.rustfs.com" class="text-blue-600 hover:underline">{{ t('Get Help') }}</nuxt-link>
            </p>
          </div>

          <div class="flex items-center justify-around gap-4 w-1/2 mx-auto">
            <div class="inline-flex">
              <theme-switcher />
            </div>
            <div class="inline-flex">
              <language-switcher />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
