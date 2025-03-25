<script lang="ts" setup>
setPageLayout('plain')

import { ref } from 'vue'
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

const options = ref([
  { label: '秘钥登录', value: 'accessKeyAndSecretKey' },
  { label: 'STS 登录', value: 'sts' },
])

const message = useMessage()
const auth = useAuth()

const handleLogin = async () => {
  const credentials = method.value === 'accessKeyAndSecretKey' ? accessKeyAndSecretKey.value : sts.value

  try {
    await auth.login(credentials)
    message.success('登录成功')
    window.location.href = '/'
  } catch (error) {
    message.error('登录失败')
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
  <div class="flex flex-col items-center justify-center min-h-screen bg relative">
    <img src="~/assets/logo.svg" class="max-w-28" alt="" />
    <div class="mt-7 w-full max-w-sm z-10 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
      <div class="p-4 sm:p-7">
        <div class="text-center">
          <h1 class="block text-2xl font-bold text-gray-800 dark:text-white">登录</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-neutral-400">
            欢迎回来! <br>
            <!-- 请登录账号 -->
          </p>
        </div>

        <div class="mt-5 space-y-4">
          <n-select v-model:value="method" :options="options" />

          <!-- Form -->
          <form @submit.prevent="handleLogin">
            <div class="grid gap-y-6">
              <template v-if="method == 'accessKeyAndSecretKey'">
                <div>
                  <label for="accessKey" class="block text-sm mb-2 dark:text-white">账号</label>
                  <n-input v-model:value="accessKeyAndSecretKey.accessKeyId" type="text" placeholder="请输入账号" />
                </div>
                <div>
                  <div class="flex justify-between items-center">
                    <label for="secretKey" class="block text-sm mb-2 dark:text-white">秘钥</label>
                  </div>
                  <n-input v-model:value="accessKeyAndSecretKey.secretAccessKey" type="password" placeholder="请输入秘钥" />
                </div>
              </template>

              <template v-else>
                <div>
                  <label for="accessKey" class="block text-sm mb-2 dark:text-white">STS 用户名</label>
                  <n-input v-model:value="sts.accessKeyId" type="text" placeholder="请输入STS 用户名" />
                </div>
                <div>
                  <label for="sts.secretAccessKey" class="block text-sm mb-2 dark:text-white">STS 秘钥</label>
                  <n-input v-model:value="sts.secretAccessKey" type="password" placeholder="请输入STS 秘钥" />
                </div>
                <div>
                  <label for="sessionToken" class="block text-sm mb-2 dark:text-white">STS sessionToken</label>
                  <n-input v-model:value="sts.sessionToken" type="text" placeholder="请输入 STS sessionToken" />
                </div>
              </template>

              <button type="submit"
                class="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">登 录</button>
            </div>
          </form>
          <!-- End Form -->
        </div>
      </div>
    </div>
  </div>
</template>
