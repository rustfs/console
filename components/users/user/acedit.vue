<template>
  <div>
    <n-card>
      <n-form
        ref="subFormRef"
        label-placement="left"
        :model="formModel"
        :rules="rules"
        label-align="right"
        :label-width="130">
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-grid-item :span="24" :label="t('Access Key')" path="accessKey">
            <n-input v-model:value="formModel.accessKey" :disabled="true" />
          </n-form-item-grid-item>
          <!-- <n-form-item-grid-item :span="24" label="Secret Key" path="secretKey">
            <n-input v-model:value="formModel.secretKey" show-password-on="mousedown" type="password" />
          </n-form-item-grid-item> -->
          <n-form-item-grid-item :span="24" :label="t('Expiration')" path="expiry">
            <n-date-picker
              class="!w-full"
              v-model:value="formModel.expiry"
              :is-date-disabled="dateDisabled"
              value-format="yyyy-MM-ddTkk:mm:SSS"
              type="datetime"
              clearable />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" :label="t('Name')" path="name">
            <n-input v-model:value="formModel.name" />
          </n-form-item-grid-item>

          <n-form-item-grid-item :span="24" :label="t('Description')" path="description">
            <n-input v-model:value="formModel.description" />
          </n-form-item-grid-item>

          <n-form-item-gi :span="24">
            <n-form-item-gi :span="24" :label="t('Use Main Account Policy')" path="impliedPolicy">
              <n-switch v-model:value="formModel.impliedPolicy" />
            </n-form-item-gi>
            <n-form-item-grid-item :span="24" :label="t('Status')" path="accountStatus">
              <n-switch v-model:value="formModel.accountStatus" checked-value="on" unchecked-value="off" />
            </n-form-item-grid-item>
          </n-form-item-gi>
          <n-form-item-gi v-if="!formModel.impliedPolicy" :span="24" :label="t('Current User Policy')" path="policy">
            <json-editor v-model="formModel.policy" />
          </n-form-item-gi>
        </n-grid>
        <n-space>
          <NFlex justify="center">
            <NButton secondary @click="cancelEdit">{{ t('Cancel') }}</NButton>
            <NButton secondary @click="submitForm">{{ t('Submit') }}</NButton>
          </NFlex>
        </n-space>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { type FormItemRule, type FormInst, NButton, NSpace } from "naive-ui"
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { updateServiceAccount } = useAccessKeys()
const { $api } = useNuxtApp()
const { getPolicyByUserName } = usePolicies()

// 验证
const rules = ref({
  accessKey: {
    required: true,
    trigger: ["blur", "input"],
    message: t('Please enter Access Key'),
  },
  secretKey: {
    required: true,
    trigger: ["blur", "input"],
    message: t('Please enter Secret Key'),
  },
  expiry: {
    required: true,
    trigger: ["blur", "change"],
    validator(rule: FormItemRule, value: string) {
      if (!value) {
        return new Error(t('Please select expiration date'))
      }
      return true
    },
  },
})

const message = useMessage()
const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
})

const formModel = ref({
  accessKey: "",
  name: "",
  description: "",
  impliedPolicy: true,
  expiry: null,
  policy: "",
  accountStatus: "on",
})

watch(
  () => props.user,
  () => {
    formModel.value = {
      accessKey: props.user.accessKey,
      name: props.user.name,
      description: props.user.description,
      impliedPolicy: props.user.impliedPolicy,
      expiry: props.user.expiration,
      policy: props.user.policy,
      accountStatus: props.user.accountStatus,
    }
    // 如果没有默认策略，则获取默认策略
    if (props.user.impliedPolicy) getPolicie()
  },
  {
    deep: true,
  }
)

const parentPolicy = ref("")
// 默认策略原文
const getPolicie = async () => {
  parentPolicy.value = JSON.stringify(await getPolicyByUserName(props.user.parentUser))
  formModel.value.policy = parentPolicy.value
}

function cancelEdit() {
  formModel.value = {
    accessKey: "",
    name: "",
    description: "",
    impliedPolicy: true,
    expiry: null,
    policy: "",
    accountStatus: "on",
  }
  emit("search")
}

interface Emits {
  (e: "search"): void
}
const emit = defineEmits<Emits>()
const subFormRef = ref<FormInst | null>(null)
async function submitForm() {
  subFormRef.value?.validate(async (errors) => {
    if (!errors) {
      try {
        const res = await updateServiceAccount(props.user.accessKey, {
          newStatus: formModel.value.accountStatus,
          newName: formModel.value.name,
          newDescription: formModel.value.description,
          newPolicy: !formModel.value.impliedPolicy ? JSON.stringify(JSON.parse(formModel.value.policy)) : null,
          newExpiration: formModel.value.expiry ? new Date(formModel.value.expiry).toISOString() : null,
        })

        message.success(t('Update Success'))
        emit("search")
        cancelEdit()
      } catch (error) {
        console.log(error)
        message.error(t('Update Failed'))
      }
    } else {
      console.log(errors)
      message.error(t('Please fill in the correct format'))
    }
  })
}
function dateDisabled(ts: number) {
  const date = new Date(ts)
  return date < new Date()
}
</script>

<style lang="scss" scoped></style>
