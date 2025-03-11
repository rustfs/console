<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    title="创建秘钥"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-card>
      <n-form
        ref="formRef"
        label-placement="left"
        :model="formModel"
        :rules="rules"
        label-align="center"
        :label-width="130">
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-gi :span="24" label="Access Key" path="accessKey">
            <n-input v-model:value="formModel.accessKey" />
          </n-form-item-gi>
          <n-form-item-gi :span="24" label="Secret Key" path="secretKey">
            <n-input v-model:value="formModel.secretKey" show-password-on="mousedown" type="password" />
          </n-form-item-gi>

          <!-- <n-form-item-gi :span="24" label="策略" path="policy">
            <n-select v-model:value="formModel.policy" filterable multiple :options="polices" />
          </n-form-item-gi> -->

          <n-form-item-gi :span="24" label="有效期" path="expiry">
            <n-date-picker
              class="!w-full"
              v-model:value="formModel.expiry"
              :is-date-disabled="dateDisabled"
              type="datetime"
              clearable />
          </n-form-item-gi>
          <n-form-item-gi :span="24" label="名称" path="name">
            <n-input v-model:value="formModel.name" />
          </n-form-item-gi>
          <!-- <n-form-item-gi :span="24" label="描述" path="comment">
            <n-input v-model:value="formModel.comment" />
          </n-form-item-gi> -->
          <n-form-item-gi :span="24" label="注释" path="description">
            <n-input v-model:value="formModel.description" />
          </n-form-item-gi>
          <n-form-item-gi :span="24" label="使用主账户策略" path="impliedPolicy">
            <n-switch v-model:value="formModel.impliedPolicy" />
          </n-form-item-gi>
          <n-form-item-gi v-if="!formModel.impliedPolicy" :span="24" label="当前用户策略" path="policy">
            <json-editor v-model="formModel.policy" />
          </n-form-item-gi>
        </n-grid>
      </n-form>
    </n-card>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">取消</n-button>
        <n-button type="primary" @click="submitForm">提交</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
<script setup lang="ts">
import type { FormInst, FormItemRule } from "naive-ui"
import { computed, ref } from "vue"
import { makeRandomString } from "~/utils/functions"

interface Props {
  visible: boolean
}
const { visible } = defineProps<Props>()
const message = useMessage()
const { $api } = useNuxtApp()
const { createServiceAccount } = useAccessKeys()

const emit = defineEmits<Emits>()
const defaultFormModal = {
  accessKey: makeRandomString(20),
  secretKey: makeRandomString(40),
  name: "",
  description: "",
  // comment: "",
  expiry: null,
  policy: "",
  impliedPolicy: true,
}
const formModel = ref({ ...defaultFormModal })

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

interface Emits {
  (e: "update:visible", visible: boolean): void
  (e: "search"): void
  (e: "notice", data: object): void
}

const modalVisible = computed({
  get() {
    return visible
  },
  set(visible) {
    closeModal(visible)
  },
})
function closeModal(visible = false) {
  emit("update:visible", visible)
  formModel.value = { ...defaultFormModal, policy: JSON.stringify(parentPolicy.value) }
}

function dateDisabled(ts: number) {
  const date = new Date(ts)
  return date < new Date()
}

const formRef = ref<FormInst | null>(null)
async function submitForm(e: MouseEvent) {
  // e.preventDefault()
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      try {
        const res = await createServiceAccount({
          ...formModel.value,
          policy: !formModel.value.impliedPolicy ? JSON.stringify(JSON.parse(formModel.value.policy)) : null,
          expiration: formModel.value.expiry ? new Date(formModel.value.expiry).toISOString() : null,
        })
        message.success("添加成功")
        emit("notice", res)
        closeModal()
        emit("search")
      } catch (error) {
        console.log("🚀 ~ submitForm ~ error:", error)
        message.error("添加失败")
      }
    } else {
      console.log(errors)
      message.error("请填写正确的格式")
    }
  })
}

const parentPolicy = ref("")
// 默认策略原文
const getPolicie = async () => {
  const userInfo = await $api.get(`/accountinfo`)
  parentPolicy.value = userInfo.Policy
  formModel.value.policy = JSON.stringify(userInfo.Policy)
}
getPolicie()
</script>

<style scoped></style>
