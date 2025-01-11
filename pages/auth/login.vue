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
  { label: 'Login with accessKeyAndSecretKey', value: 'accessKeyAndSecretKey' },
  { label: 'Login with sts', value: 'sts' },
])

const message = useMessage()
const auth = useAuth()

const handleLogin = async () => {
  const credentials = method.value === 'accessKeyAndSecretKey' ? accessKeyAndSecretKey.value : sts.value

  try {
    await auth.login(credentials)
    message.success('Login success')
    window.location.href = '/'
  } catch (error) {
    message.error('Login failed')
  }
}

</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100 relative">
    <img src="~/assets/backgrounds/gradient-waves.svg" class="absolute z-0 top-0 left-0 w-full h-full object-cover" />
    <div class="mt-7 w-full max-w-sm z-10 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
      <div class="p-4 sm:p-7">
        <div class="text-center">
          <h1 class="block text-2xl font-bold text-gray-800 dark:text-white">Sign in</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-neutral-400">
            Welcome back! <br>
            please sign in to your account
          </p>
        </div>

        <div class="mt-5 space-y-4">
          <n-select v-model:value="method" :options="options" />

          <!-- Form -->
          <form @submit.prevent="handleLogin">
            <div class="grid gap-y-6">
              <template v-if="method == 'accessKeyAndSecretKey'">
                <div>
                  <label for="accessKey" class="block text-sm mb-2 dark:text-white">Access Key Id</label>
                  <n-input v-model:value="accessKeyAndSecretKey.accessKeyId" type="text" placeholder="Please input you access key id" />
                </div>
                <div>
                  <div class="flex justify-between items-center">
                    <label for="secretKey" class="block text-sm mb-2 dark:text-white">Secret Access Key</label>
                  </div>
                  <n-input v-model:value="accessKeyAndSecretKey.secretAccessKey" type="password" placeholder="Please input you secret access key" />
                </div>
              </template>

              <template v-else>
                <div>
                  <label for="accessKey" class="block text-sm mb-2 dark:text-white">STS Access Key Id</label>
                  <n-input v-model:value="sts.accessKeyId" type="text" placeholder="Please input you STS access key id" />
                </div>
                <div>
                  <label for="sts.secretAccessKey" class="block text-sm mb-2 dark:text-white">STS Secret Access Key</label>
                  <n-input v-model:value="sts.secretAccessKey" type="password" placeholder="Please input you STS secret access key" />
                </div>
                <div>
                  <label for="sessionToken" class="block text-sm mb-2 dark:text-white">STS sessionToken</label>
                  <n-input v-model:value="sts.sessionToken" type="text" placeholder="Please input you STS sessionToken" />
                </div>
              </template>

              <button type="submit"
                class="w-full py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">Sign
                in</button>
            </div>
          </form>
          <!-- End Form -->
        </div>
      </div>
    </div>
  </div>
</template>
