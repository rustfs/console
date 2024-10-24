<script setup lang="ts">
import type { FormInst } from 'naive-ui'
import { useAuthStore } from '@/store'
import { local } from '@/utils'

const emit = defineEmits(['update:modelValue'])

const authStore = useAuthStore()

function toOtherForm(type: any) {
  emit('update:modelValue', type)
}

const { t } = useI18n()
const rules = computed(() => {
  return {
    accessKey: {
      required: true,
      trigger: 'blur',
      message: t('login.accountRuleTip'),
    },
    secretKey: {
      required: true,
      trigger: 'blur',
      message: t('login.passwordRuleTip'),
    },
  }
})
const formValue = ref({
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
})
const isRemember = ref(false)
const isLoading = ref(false)

const formRef = ref<FormInst | null>(null)
function handleLogin() {
  formRef.value?.validate(async (errors) => {
    if (errors)
      return

    isLoading.value = true
    const { accessKey, secretKey } = formValue.value

    if (isRemember.value)
      local.set('userLoggedIn', { accessKey, secretKey })
    else local.remove('userLoggedIn')

    await authStore.login(accessKey, secretKey)
    isLoading.value = false
  })
}
onMounted(() => {
  checkUserAccount()
})
// 检查是否有记录登录账号
function checkUserAccount() {
  const userAccount = local.get('userLoggedIn')
  if (!userAccount)
    return

  formValue.value = userAccount
  isRemember.value = true
}
</script>

<template>
  <div>
    <n-h2 depth="3" class="text-center">
      {{ $t('login.welcomeTitle') }}
    </n-h2>
    <n-form ref="formRef" :rules="rules" :model="formValue" :show-label="false" size="large">
      <n-form-item path="accessKey">
        <n-input v-model:value="formValue.accessKey" clearable :placeholder="$t('login.accountPlaceholder')" />
      </n-form-item>
      <n-form-item path="secretKey">
        <n-input v-model:value="formValue.secretKey" type="password" :placeholder="$t('login.passwordPlaceholder')" clearable show-password-on="click">
          <template #password-invisible-icon>
            <icon-park-outline-preview-close-one />
          </template>
          <template #password-visible-icon>
            <icon-park-outline-preview-open />
          </template>
        </n-input>
      </n-form-item>
      <n-space vertical :size="20">
        <div class="flex-y-center justify-between">
          <n-checkbox v-model:checked="isRemember">
            {{ $t('login.rememberMe') }}
          </n-checkbox>
          <n-button type="info" text @click="toOtherForm('stsLogin')">
            {{ $t('login.stsLogin') }}
          </n-button>
        </div>
        <n-button block color="#447cf5" type="primary" size="large" :loading="isLoading" :disabled="isLoading" @click="handleLogin">
          {{ $t('login.signIn') }}
        </n-button>
        <n-divider>
          <n-text type="info">
            <a href="https://rustfs.com/" target="_blank">{{ $t('login.aboutRustFS') }}</a>
          </n-text>
          <!-- <n-button
            text
            type="primary"
            @click=""
          >

          </n-button> -->
        </n-divider>
      </n-space>
    </n-form>
  </div>
</template>

<style scoped></style>
