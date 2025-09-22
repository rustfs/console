<script lang="ts" setup>
await setPageLayout('plain');

import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const method = ref('accessKeyAndSecretKey');
const accessKeyAndSecretKey = ref({
  accessKeyId: '',
  secretAccessKey: '',
});

const sts = ref({
  accessKeyId: '',
  secretAccessKey: '',
  sessionToken: '',
});

const message = useMessage();
const auth = useAuth();

const handleLogin = async () => {
  const credentials = method.value === 'accessKeyAndSecretKey' ? accessKeyAndSecretKey.value : sts.value;

  try {
    // 使用配置管理器获取配置（优先使用localStorage中的配置）
    const { configManager } = await import('~/utils/config');
    const currentConfig = await configManager.loadConfig();

    await auth.login(credentials, currentConfig);

    message.success(t('Login Success'));
    // 重新加载页面以确保新的配置生效
    window.location.reload();
  } catch (error) {
    message.error(t('Login Failed'));
  }
};
</script>

<template>
  <div class="lg:p-20 flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-neutral-800">
    <img src="~/assets/backgrounds/scillate.svg" class="absolute inset-0 z-0 opacity-45" alt="" />
    <div
      class="flex-1 flex w-full z-10 max-w-7xl lg:max-h-[85vh] shadow-lg rounded-lg overflow-hidden mx-auto dark:bg-neutral-800 dark:border-neutral-700"
    >
      <div class="hidden lg:block w-1/2">
        <auth-heros-static></auth-heros-static>
      </div>
      <div
        class="w-full lg:w-1/2 flex flex-col justify-center items-center bg-white dark:bg-neutral-900 dark:border-neutral-700 relative"
      >
        <!-- 表单容器右上角的配置按钮 -->
        <div class="absolute top-4 right-4 z-10">
          <NuxtLink
            to="/config"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-800 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
            :title="t('Server Configuration')"
          >
            <Icon name="ri:settings-3-line" class="text-sm" />
          </NuxtLink>
        </div>

        <div class="max-w-sm w-full p-4 sm:p-7">
          <img src="~/assets/logo.svg" class="max-w-28" alt="" />
          <div class="py-6">
            <h1 class="block text-2xl font-bold text-gray-800 dark:text-white">{{ t('Login to RustFS Console') }}</h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              {{ t('Welcome back!') }} <br />
              <!-- 请登录账号 -->
            </p>
          </div>

          <div class="mt-5 space-y-4">
            <n-tabs type="segment" animated size="small" v-model:value="method">
              <n-tab-pane name="accessKeyAndSecretKey" :tab="t('Key Login')" />
              <n-tab-pane name="sts" :tab="t('STS Login')" />
            </n-tabs>

            <!-- Form -->
            <form @submit.prevent="handleLogin" autocomplete="off">
              <div class="grid gap-y-6">
                <template v-if="method == 'accessKeyAndSecretKey'">
                  <div>
                    <label for="accessKey" class="block text-sm mb-2 dark:text-white">{{ t('Account') }}</label>
                    <n-input
                      v-model:value="accessKeyAndSecretKey.accessKeyId"
                      autocomplete="new-password"
                      type="text"
                      :placeholder="t('Please enter account')"
                    />
                  </div>
                  <div>
                    <div class="flex justify-between items-center">
                      <label for="secretKey" class="block text-sm mb-2 dark:text-white">{{ t('Key') }}</label>
                    </div>
                    <n-input
                      v-model:value="accessKeyAndSecretKey.secretAccessKey"
                      autocomplete="new-password"
                      type="password"
                      :placeholder="t('Please enter key')"
                    />
                  </div>
                </template>

                <template v-else>
                  <div>
                    <label for="accessKey" class="block text-sm mb-2 dark:text-white">{{ t('STS Username') }}</label>
                    <n-input
                      v-model:value="sts.accessKeyId"
                      autocomplete="new-password"
                      type="text"
                      :placeholder="t('Please enter STS username')"
                    />
                  </div>
                  <div>
                    <label for="sts.secretAccessKey" class="block text-sm mb-2 dark:text-white">{{
                      t('STS Key')
                    }}</label>
                    <n-input
                      v-model:value="sts.secretAccessKey"
                      autocomplete="new-password"
                      type="password"
                      :placeholder="t('Please enter STS key')"
                    />
                  </div>
                  <div>
                    <label for="sessionToken" class="block text-sm mb-2 dark:text-white">{{
                      t('STS Session Token')
                    }}</label>
                    <n-input
                      v-model:value="sts.sessionToken"
                      autocomplete="new-password"
                      type="text"
                      :placeholder="t('Please enter STS session token')"
                    />
                  </div>
                </template>

                <button
                  type="submit"
                  class="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {{ t('Login') }}
                </button>
              </div>
            </form>
            <!-- End Form -->
          </div>

          <div class="my-8">
            <p class="text-sm text-gray-600 dark:text-neutral-400">
              {{ t('Login Problems?') }}
              <NuxtLink to="https://www.rustfs.com" class="text-blue-600 hover:underline">{{ t('Get Help') }}</NuxtLink>
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
