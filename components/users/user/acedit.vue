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
          <n-form-item-grid-item :span="24" label="Access Key" path="accessKey">
            <n-input v-model:value="formModel.accessKey" :disabled="true" />
          </n-form-item-grid-item>
          <!-- <n-form-item-grid-item :span="24" label="Secret Key" path="secretKey">
            <n-input v-model:value="formModel.secretKey" show-password-on="mousedown" type="password" />
          </n-form-item-grid-item> -->
          <n-form-item-grid-item :span="24" label="有效期" path="expiry">
            <n-date-picker
              class="!w-full"
              v-model:value="formModel.expiry"
              :is-date-disabled="dateDisabled"
              value-format="yyyy-MM-ddTkk:mm:SSS"
              type="datetime"
              clearable />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="名称" path="name">
            <n-input v-model:value="formModel.name" />
          </n-form-item-grid-item>

          <n-form-item-grid-item :span="24" label="注释" path="description">
            <n-input v-model:value="formModel.description" />
          </n-form-item-grid-item>

          <n-form-item-gi :span="24">
            <n-form-item-gi :span="24" label="使用主账户策略" path="impliedPolicy">
              <n-switch v-model:value="formModel.impliedPolicy" />
            </n-form-item-gi>
            <n-form-item-grid-item :span="24" label="状态" path="accountStatus">
              <n-switch v-model:value="formModel.accountStatus" checked-value="on" unchecked-value="off" />
            </n-form-item-grid-item>
          </n-form-item-gi>
          <n-form-item-gi v-if="!formModel.impliedPolicy" :span="24" label="当前用户策略" path="policy">
            <json-editor v-model="formModel.policy" />
          </n-form-item-gi>
        </n-grid>
        <n-space>
          <NFlex justify="center">
            <NButton secondary @click="cancelEdit">取消</NButton>
            <NButton secondary @click="submitForm">提交</NButton>
          </NFlex>
        </n-space>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { type FormItemRule, type FormInst, NButton, NSpace } from "naive-ui"
// 随机字符串函数
const { updateServiceAccount } = useAccessKeys()
const { $api } = useNuxtApp()
const { getPolicyByUserName } = usePolicies()
// 验证
const rules = ref({
  accessKey: {
    required: true,
    trigger: ["blur", "input"],
    message: "请输入Access Key",
  },
  secretKey: {
    required: true,
    trigger: ["blur", "input"],
    message: "请输入Secret Key",
  },
  expiry: {
    required: true,
    trigger: ["blur", "change"],
    // message: "请选择有效期",
    validator(rule: FormItemRule, value: string) {
      if (!value) {
        return new Error("请选择有效期")
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
    // 新增
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
          newStatus: formModel.value.accountStatus, // 可选，新状态
          newName: formModel.value.name, // 可选，新名称
          newDescription: formModel.value.description, // 可选，新描述
          newPolicy: !formModel.value.impliedPolicy ? JSON.stringify(JSON.parse(formModel.value.policy)) : null, // 可选，新策略
          newExpiration: formModel.value.expiry ? new Date(formModel.value.expiry).toISOString() : null, // 可选，新过期时间
        })

        message.success("修改成功")
        emit("search")
        cancelEdit()
      } catch (error) {
        console.log(error)
        message.error("修改失败")
      }
    } else {
      console.log(errors)
      message.error("请填写正确的格式")
    }
  })
}
function dateDisabled(ts: number) {
  const date = new Date(ts)
  return date < new Date()
}
</script>

<style lang="scss" scoped></style>
