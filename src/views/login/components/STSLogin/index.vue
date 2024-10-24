<script setup lang="ts">
import type { FormInst } from 'naive-ui'
import { useAuthStore } from '@/store'
import { local } from '@/utils'

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const authStore = useAuthStore()
const isRemember = ref(false)
const isLoading = ref(false)

const formRef = ref<FormInst | null>(null)

function toLogin() {
  emit('update:modelValue', 'login')
}

const rules = {
  accessKey: {
    required: true,
    trigger: 'blur',
    message: t('login.stsUserNameTip'),
  },
  secretKey: {
    required: true,
    trigger: 'blur',
    message: t('login.stsSecretKeyTip'),
  },
  sts: {
    required: true,
    trigger: 'blur',
    message: t('login.stsTokenTip'),
  },
}
const formValue = ref({
  accessKey: '',
  secretKey: '',
  sts: '',
})

function handleRegister() {
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
</script>

<template>
  <div>
    <n-h2 depth="3" class="text-center">
      {{ $t('login.welcomeTitle') }}
    </n-h2>
    <n-form
      :rules="rules"
      :model="formValue"
      :show-label="false"
      size="large"
    >
      <n-form-item path="accessKey">
        <n-input
          v-model:value="formValue.accessKey"
          clearable
          :placeholder="$t('login.stsUserNameTip')"
        />
      </n-form-item>
      <n-form-item path="secretKey">
        <n-input
          v-model:value="formValue.secretKey"
          type="password"
          :placeholder="$t('login.stsSecretKeyTip')"
          clearable
          show-password-on="click"
        >
          <template #password-invisible-icon>
            <icon-park-outline-preview-close-one />
          </template>
          <template #password-visible-icon>
            <icon-park-outline-preview-open />
          </template>
        </n-input>
      </n-form-item>
      <n-form-item path="sts">
        <n-input
          v-model:value="formValue.sts"
          :placeholder="$t('login.stsToken')"
          clearable
        />
      </n-form-item>
      <n-form-item>
        <n-space
          vertical
          :size="20"
          class="w-full"
        >
          <n-button
            block
            type="info"
            @click="handleRegister"
          >
            {{ $t('login.signIn') }}
          </n-button>
          <n-divider>
            <n-button
              text
              type="info"
              @click="toLogin"
            >
              {{ $t('login.loginByAcc') }}
            </n-button>
          </n-divider>
        </n-space>
      </n-form-item>
    </n-form>
  </div>
</template>

<style scoped></style>
