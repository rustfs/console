<script setup lang="ts">
// import { createServiceAccountCreds } from '@/service'
import { computed, ref } from 'vue'

interface Props {
  visible: boolean
}
const { visible } = defineProps<Props>()
const message = useMessage()
const { $api } = useNuxtApp()

const emit = defineEmits<Emits>()
const defaultFormModal = {
  accesskey: '',
  secretkey: '',
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
    const res = await $api.post('/service-account-credentials', {
      body: formModel.value
    })
    message.success('添加成功')
    closeModal()
    emit('search')
  } catch (error) {
    message.error('添加失败')
  }
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    title="添加Access Key"
    class="w-1/2"
    :segmented="{
      content: true,
      action: true
    }">
    <n-form
      label-placement="left"
      :model="formModel"
      label-align="left"
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
        <!-- TODO: 时间格式有问题 -->
        <n-form-item-grid-item :span="24" label="有效期" path="expiry">
          <n-date-picker
            v-model:value="formModel.expiry"
            :is-date-disabled="dateDisabled"
            type="datetime"
            clearable />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="24" label="名称" path="name">
          <n-input v-model:value="formModel.name" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="24" label="描述" path="comment">
          <n-input v-model:value="formModel.comment" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="24" label="注释" path="description">
          <n-input v-model:value="formModel.description" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="24" label="限制超出用户策略" path="flag">
          <n-switch v-model:value="formModel.flag" />
        </n-form-item-grid-item>
        <n-form-item-grid-item
          v-if="formModel.flag"
          :span="24"
          label="限制超出用户策略"
          path="policy">
          <n-input
            v-model:value="formModel.policy"
            type="textarea"
            placeholder="" />
        </n-form-item-grid-item>
      </n-grid>
    </n-form>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal()">取消</n-button>
        <n-button type="primary" @click="submitForm">提交</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped>
.n-date-picker {
  width: 100%;
}
</style>
