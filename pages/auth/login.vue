<script lang="ts" setup>
await setPageLayout('plain')

import { Motion } from "motion-v"
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AuroraBackground from '~/components/ui/aurora-background/AuroraBackground.vue'

const { t } = useI18n()
const router = useRouter()

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

const message = useMessage()
const auth = useAuth()

const handleLogin = async () => {
  const credentials = method.value === 'accessKeyAndSecretKey' ? accessKeyAndSecretKey.value : sts.value

  try {
    await auth.login(credentials)
    message.success(t('Login Success'))
    router.push('/')
  } catch (error) {
    message.error(t('Login Failed'))
  }
}
</script>

<style>
.bg {
  background-color: #191919;
  opacity: 1;
  background-image: linear-gradient(#090909 1.6px, transparent 1.6px),
    linear-gradient(to right, #090909 1.6px, #191919 1.6px);
  background-size: 32px 32px;
}
</style>


<template>
  <div class="lg:p-20 flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-neutral-700">
    <AuroraBackground class="absolute inset-0 z-0">
      <Motion as="div" :initial="{ opacity: 0, y: 40, filter: 'blur(10px)' }" :in-view="{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
      }" :transition="{
        delay: 0.3,
        duration: 0.8,
        ease: 'easeInOut',
      }" class="relative flex flex-col items-center justify-center gap-4 px-4">
      </Motion>
    </AuroraBackground>
    <div class="flex-1 flex w-full z-10 max-w-7xl lg:max-h-[75vh] shadow-lg rounded-lg overflow-hidden mx-auto dark:bg-neutral-800 dark:border-neutral-700">
      <div class="hidden lg:block w-1/2">
        <auth-heros-ripple></auth-heros-ripple>
      </div>
      <div class="w-full lg:w-1/2 flex flex-col justify-center items-center bg-white dark:bg-neutral-900 dark:border-neutral-700 relative">
        <div class="max-w-sm w-full p-4 sm:p-7">
          <img src="~/assets/logo.svg" class="max-w-28" alt="" />
          <div class="py-6">
            <h1 class="block text-2xl font-bold text-gray-800 dark:text-white">{{ t('Login to RustFS Console') }}</h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-neutral-400">
              {{ t('Welcome back!') }} <br>
              <!-- 请登录账号 -->
            </p>
          </div>

          <div class="mt-5 space-y-4">
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
