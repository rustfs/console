<script setup lang="ts">
// import { getServiceAccount, updateServiceAccount } from '@/service'
import { ref } from 'vue'

const emit = defineEmits<Emits>()

const visible = ref(false)

const defaultFormModal = {
  accesskey: '',
  secretkey: '',
  name: '',
  description: '',
  comment: '',
  expiry: null,
  policy: '',
  status: false
}
const formModel = ref({ ...defaultFormModal })

const accessKey = ref<string>('')
function openDialog(accKey: string) {
  accessKey.value = accKey
  // getServiceAccount(btoa(unescape(encodeURIComponent(accKey)))).then((res: any) => {
  //   const { isSuccess } = res
  //   if (isSuccess) {
  //     formModel.value = res.data
  //     visible.value = true
  //   }
  // })
}

defineExpose({ openDialog })

interface Emits {
  (e: 'search'): void
}

function closeModal() {
  visible.value = false
}

function dateDisabled(ts: number) {
  const date = new Date(ts)
  return date < new Date()
}

function submitForm() {
  // updateServiceAccount(accessKey.value, {
  //   policy: formModel.value.policy
  // }).then((res: any) => {
  //   const { isSuccess } = res
  //   if (isSuccess) {
  //     window.$message.success('添加成功')
  //     closeModal()
  //     emit('search')
  //   }
  // })
}
</script>

<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    title="修改Access Key"
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
        <n-form-item-grid-item :span="24" label="Access Key策略" path="policy">
          <n-input
            v-model:value="formModel.policy"
            type="textarea"
            placeholder="" />
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
        <n-form-item-grid-item :span="24" label="状态" path="status">
          <n-switch v-model:value="formModel.status" />
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
