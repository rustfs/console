<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    title="创建秘钥"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true
    }">
    <n-card>
      <n-form
        label-placement="left"
        :model="formModel"
        label-align="center"
        :label-width="130">
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-grid-item :span="24" label="Access Key" path="accesskey">
            <n-input v-model:value="formModel.accesskey" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="Secret Key" path="secretkey">
            <n-input
              v-model:value="formModel.secretkey"
              show-password-on="mousedown"
              type="password" />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="24" label="策略" path="policy">
            <n-select
              v-model:value="formModel.policy"
              filterable
              multiple
              :options="polices" />
          </n-form-item-grid-item>

          <!-- TODO: 时间格式有问题 -->
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
          <!-- <n-form-item-grid-item :span="24" label="描述" path="comment">
            <n-input v-model:value="formModel.comment" />
          </n-form-item-grid-item> -->
          <n-form-item-grid-item :span="24" label="注释" path="description">
            <n-input v-model:value="formModel.description" />
          </n-form-item-grid-item>
          <!-- <n-form-item-grid-item
            :span="24"
            label="限制超出用户策略"
            path="flag">
            <n-switch v-model:value="formModel.flag" />
          </n-form-item-grid-item>
          <n-form-item-grid-item
            v-if="formModel.flag"
            :span="24"
            label="策略详情"
            path="policy">
            <json-editor v-model="formModel.policy" />
          </n-form-item-grid-item> -->
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
import { computed, ref } from 'vue'
import { makeRandomString } from '~/utils/functions'

interface Props {
  visible: boolean
}
const { visible } = defineProps<Props>()
const message = useMessage()
const { $api } = useNuxtApp()
const { createServiceAccountCreds } = useAccessKeys()
const { listPolicies } = usePolicies()
const { credentials } = useAuth()

const emit = defineEmits<Emits>()
const defaultFormModal = {
  accesskey: makeRandomString(20),
  secretkey: makeRandomString(40),
  name: '',
  description: '',
  comment: '',
  expiry: null,
  policy: '',
  flag: false
}
const formModel = ref({ ...defaultFormModal })

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'search'): void
  (e: 'notice', data: object): void
}

const modalVisible = computed({
  get() {
    return visible
  },
  set(visible) {
    closeModal(visible)
  }
})
function closeModal(visible = false) {
  emit('update:visible', visible)
}

function dateDisabled(ts: number) {
  const date = new Date(ts)
  return date < new Date()
}
async function submitForm() {
  try {
    const res = await createServiceAccountCreds({
      ...formModel.value,
      targetUser: credentials.value?.AccessKeyId,
      status: 'enabled'
      // expiry: new Date(formModel.value.expiry || '').toISOString()
    })
    message.success('添加成功')
    emit('notice', res)
    closeModal()
    emit('search')
  } catch (error) {
    message.error('添加失败')
  }
}

// 策略列表
const polices = ref<any[]>([])

const getPoliciesList = async () => {
  const res = await listPolicies()
  polices.value = Object.keys(res).map((key) => {
    return {
      label: key,
      value: key
    }
  })
}
getPoliciesList()
</script>

<style scoped></style>
