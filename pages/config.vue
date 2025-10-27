<script lang="ts" setup>
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

await setPageLayout('plain');

import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
const { t } = useI18n();
const router = useRouter();
const message = useMessage();

const serverHost = ref('');
const isValid = ref(false);

const validateAndSave = async () => {
  try {
    if (serverHost.value) {
      // 更宽松的URL验证
      let urlToValidate = serverHost.value.trim();

      // 如果没有协议，自动添加https://
      if (!urlToValidate.match(/^https?:\/\//)) {
        urlToValidate = 'https://' + urlToValidate;
      }

      // 验证URL格式
      const url = new URL(urlToValidate);
      console.log('Valid URL:', url.href); // 调试信息

      // 保存原始输入（如果用户没输入协议，就保存添加了协议的版本）
      const urlToSave = serverHost.value.match(/^https?:\/\//) ? serverHost.value : urlToValidate;
      localStorage.setItem('rustfs-server-host', urlToSave);

      // 如果我们自动添加了协议，更新输入框显示
      if (!serverHost.value.match(/^https?:\/\//)) {
        serverHost.value = urlToValidate;
      }
    } else {
      // 如果为空，清除localStorage，使用默认值
      localStorage.removeItem('rustfs-server-host');
    }

    // 清除配置缓存
    const { configManager } = await import('~/utils/config');
    configManager.clearCache();

    message.success(t('Server configuration saved successfully'));

    // 延迟后刷新页面并跳转，确保配置完全生效
    setTimeout(() => {
      window.location.href = '/rustfs/console/auth/login';
    }, 200);
  } catch (error) {
    console.error('URL validation error:', error); // 调试信息
    message.error(t('Invalid server address format') + ': ' + (error as Error).message);
  }
};

const resetToCurrentHost = async () => {
  // 清除localStorage中的配置，让系统回到默认状态（使用当前host）
  localStorage.removeItem('rustfs-server-host');

  // 清除配置缓存
  const { configManager } = await import('~/utils/config');
  configManager.clearCache();

  // 清空输入框，表示使用默认配置
  serverHost.value = '';

  message.success(t('Reset to default successfully'));

  // 延迟后跳转到登录页面，确保配置完全生效
  setTimeout(() => {
    window.location.href = '/rustfs/console/auth/login';
  }, 200);
};

const skipConfig = () => {
  router.push('/auth/login');
};

onMounted(() => {
  // 检查是否已有配置
  const saved = localStorage.getItem('rustfs-server-host');
  if (saved) {
    serverHost.value = saved;
    isValid.value = true;
  }
});
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
        <div class="max-w-sm w-full p-4 sm:p-7">
          <img src="~/assets/logo.svg" class="max-w-28" alt="" />
          <div class="py-6">
            <h1 class="block text-2xl font-bold text-gray-800 dark:text-white">
              {{ t('Server Configuration') }}
            </h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              {{ t('Please configure your RustFS server address') }}
            </p>
          </div>

          <div class="mt-5 space-y-4">
            <!-- Form -->
            <form @submit.prevent="validateAndSave" autocomplete="off">
              <div class="grid gap-y-6">
                <div>
                  <label for="serverHost" class="block text-sm mb-2 dark:text-white">{{ t('Server Address') }}</label>
                  <div class="text-xs text-gray-500 mb-2">
                    {{ t('Leave empty to use current host as default') }}
                  </div>
                  <Input
                    v-model="serverHost"
                    type="text"
                    :placeholder="t('Please enter server address (e.g., http://localhost:9000)')"
                  />
                  <div class="text-xs text-gray-500 mt-1">
                    {{ t('Example: http://localhost:9000 or https://your-domain.com') }}
                  </div>
                </div>

                <div class="flex gap-3">
                  <Button type="submit" class="flex-1">
                    {{ t('Save Configuration') }}
                  </Button>

                  <Button type="button" variant="outline" @click="resetToCurrentHost">
                    {{ t('Reset') }}
                  </Button>

                  <Button type="button" variant="outline" @click="skipConfig">
                    {{ t('Skip') }}
                  </Button>
                </div>
              </div>
            </form>
            <!-- End Form -->
          </div>

          <div class="my-8">
            <p class="text-sm text-gray-600 dark:text-neutral-400">
              {{ t('Need help?') }}
              <NuxtLink to="https://docs.rustfs.com" class="text-blue-600 hover:underline">{{
                t('View Documentation')
              }}</NuxtLink>
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