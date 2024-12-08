<script lang="ts" setup>
setPageLayout('plain')

const { $api } = useNuxtApp()
import { ref } from 'vue'
const method = ref('credentials')
const credentials = ref({
  accessKey: '',
  secretKey: '',
})

const sts = ref({
  accessKey: '',
  secretKey: '',
  sessionToken: '',
})

const options = ref([
  { label: 'Login with credentials', value: 'credentials' },
  { label: 'Login with STS', value: 'sts' },
])

const message = useMessage()

const handleLogin = async () => {
  console.log('login', method.value, credentials.value, sts.value)

  const body = method.value === 'credentials' ? credentials.value : sts.value

  try {
    await $api.post('login', body)
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
              <template v-if="method == 'credentials'">
                <div>
                  <label for="accessKey" class="block text-sm mb-2 dark:text-white">Access Key</label>
                  <n-input v-model:value="credentials.accessKey" type="text" placeholder="Please input you access key" />
                </div>
                <div>
                  <div class="flex justify-between items-center">
                    <label for="secretKey" class="block text-sm mb-2 dark:text-white">Access Secret</label>
                  </div>
                  <n-input v-model:value="credentials.secretKey" type="password" placeholder="Please input you access secret" />
                </div>
              </template>

              <template v-else>
                <div>
                  <label for="accessKey" class="block text-sm mb-2 dark:text-white">STS Access Key</label>
                  <n-input v-model:value="sts.accessKey" type="text" placeholder="Please input you STS access key" />
                </div>
                <div>
                  <label for="sts.secretKey" class="block text-sm mb-2 dark:text-white">STS Access Secret</label>
                  <n-input v-model:value="sts.secretKey" type="password" placeholder="Please input you STS access key" />
                </div>
                <div>
                  <label for="sessionToken" class="block text-sm mb-2 dark:text-white">STS sessionToken</label>
                  <n-input v-model:value="sts.sessionToken" type="text" placeholder="Please input you STS access key" />
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
