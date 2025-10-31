<script lang="ts" setup>
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getLoginRoute } from '~/utils/routes'

await setPageLayout('plain')

import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
const { t } = useI18n()
const router = useRouter()
const message = useMessage()

const serverHost = ref('')
const isValid = ref(false)

const validateAndSave = async () => {
  try {
    if (serverHost.value) {
      // More lenient URL validation
      let urlToValidate = serverHost.value.trim()

      // Auto-add https:// if no protocol is provided
      if (!urlToValidate.match(/^https?:\/\//)) {
        urlToValidate = 'https://' + urlToValidate
      }

      // Validate URL format
      const url = new URL(urlToValidate)
      console.log('Valid URL:', url.href) // Debug info

      // Save original input (if user didn't provide protocol, save the version with protocol added)
      const urlToSave = serverHost.value.match(/^https?:\/\//) ? serverHost.value : urlToValidate
      localStorage.setItem('rustfs-server-host', urlToSave)

      // If we auto-added protocol, update the input field display
      if (!serverHost.value.match(/^https?:\/\//)) {
        serverHost.value = urlToValidate
      }
    } else {
      // If empty, clear localStorage to use default value
      localStorage.removeItem('rustfs-server-host')
    }

    // Clear config cache
    const { configManager } = await import('~/utils/config')
    configManager.clearCache()

    message.success(t('Server configuration saved successfully'))

    // Refresh page and redirect after delay to ensure config is fully applied
    setTimeout(() => {
      window.location.href = getLoginRoute()
    }, 200)
  } catch (error) {
    console.error('URL validation error:', error) // Debug info
    message.error(t('Invalid server address format') + ': ' + (error as Error).message)
  }
}

const resetToCurrentHost = async () => {
  // Clear localStorage config to return to default state (use current host)
  localStorage.removeItem('rustfs-server-host')

  // Clear config cache
  const { configManager } = await import('~/utils/config')
  configManager.clearCache()

  // Clear input field to indicate using default config
  serverHost.value = ''

  message.success(t('Reset to default successfully'))

  // Redirect to login page after delay to ensure config is fully applied
  setTimeout(() => {
    window.location.href = getLoginRoute()
  }, 200)
}

const skipConfig = () => {
  router.push('/auth/login')
}

onMounted(() => {
  // Check if config already exists
  const saved = localStorage.getItem('rustfs-server-host')
  if (saved) {
    serverHost.value = saved
    isValid.value = true
  }
})
</script>

<template>
  <page>
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
                <Field>
                  <FieldLabel for="serverHost">{{ t('Server Address') }}</FieldLabel>
                  <FieldDescription>
                    {{ t('Leave empty to use current host as default') }}
                  </FieldDescription>
                  <FieldContent>
                    <Input
                      id="serverHost"
                      v-model="serverHost"
                      type="text"
                      :placeholder="t('Please enter server address (e.g., http://localhost:9000)')"
                    />
                  </FieldContent>
                  <FieldDescription>
                    {{ t('Example: http://localhost:9000 or https://your-domain.com') }}
                  </FieldDescription>
                </Field>

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
  </page>
</template>
