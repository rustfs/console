<script lang="ts" setup>
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

await setPageLayout('plain')

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const method = ref<'accessKeyAndSecretKey' | 'sts'>('accessKeyAndSecretKey')
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
    // 使用配置管理器获取配置（优先使用localStorage中的配置）
    const { configManager } = await import('~/utils/config')
    const currentConfig = await configManager.loadConfig()

    await auth.login(credentials, currentConfig)

    message.success(t('Login Success'))
    // 重新加载页面以确保新的配置生效
    window.location.reload()
  } catch (error) {
    message.error(t('Login Failed'))
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
        <!-- 表单容器右上角的配置按钮 -->
        <div class="absolute top-4 right-4 z-10">
          <NuxtLink to="/config"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-800 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
            :title="t('Server Configuration')">
            <Icon name="ri:settings-3-line" class="text-sm" />
          </NuxtLink>
        </div>

        <div class="max-w-sm w-full p-4 sm:p-7 space-y-6">
          <img src="~/assets/logo.svg" class="max-w-28" alt="" />

          <div class="space-y-4">
            <Tabs v-model="method" class="flex flex-col gap-4">
              <TabsList class="w-full">
                <TabsTrigger class="w-1/2" value="accessKeyAndSecretKey">{{ t('Key Login') }}</TabsTrigger>
                <TabsTrigger class="w-1/2" value="sts">{{ t('STS Login') }}</TabsTrigger>
              </TabsList>
            </Tabs>

            <!-- Form -->
            <form @submit.prevent="handleLogin" autocomplete="off">
              <div class="grid gap-y-6">
                <template v-if="method == 'accessKeyAndSecretKey'">
                  <Field>
                    <FieldLabel for="accessKey">{{ t('Account') }}</FieldLabel>
                    <FieldContent>
                      <Input id="accessKey" v-model="accessKeyAndSecretKey.accessKeyId" autocomplete="new-password" type="text" :placeholder="t('Please enter account')" />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel for="secretKey">{{ t('Key') }}</FieldLabel>
                    <FieldContent>
                      <Input id="secretKey" v-model="accessKeyAndSecretKey.secretAccessKey" autocomplete="new-password" type="password" :placeholder="t('Please enter key')" />
                    </FieldContent>
                  </Field>
                </template>

                <template v-else>
                  <Field>
                    <FieldLabel for="stsAccessKey">{{ t('STS Username') }}</FieldLabel>
                    <FieldContent>
                      <Input id="stsAccessKey" v-model="sts.accessKeyId" autocomplete="new-password" type="text" :placeholder="t('Please enter STS username')" />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel for="stsSecretKey">
                      {{ t('STS Key') }}
                    </FieldLabel>
                    <FieldContent>
                      <Input id="stsSecretKey" v-model="sts.secretAccessKey" autocomplete="new-password" type="password" :placeholder="t('Please enter STS key')" />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel for="sessionToken">
                      {{ t('STS Session Token') }}
                    </FieldLabel>
                    <FieldContent>
                      <Input id="sessionToken" v-model="sts.sessionToken" autocomplete="new-password" type="text" :placeholder="t('Please enter STS session token')" />
                    </FieldContent>
                  </Field>
                </template>

                <Button type="submit" variant="default" class="w-full justify-center">
                  {{ t('Login') }}
                </Button>
              </div>
            </form>
            <!-- End Form -->
          </div>

          <div class="">
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
