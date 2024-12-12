<script setup lang="ts">
import { ref } from 'vue'
const { $api } = useNuxtApp()
const message = useMessage()
const emit = defineEmits<Emits>()

const visible = ref(false)

const defaultFormModal = {
  name: '',
  policy: '{}'
}
const formModel = ref({ ...defaultFormModal })

async function openDialog(row: any) {
  formModel.value.name = row.name
  formModel.value.policy = JSON.parse(row.policy)
  visible.value = true
}

defineExpose({ openDialog })

interface Emits {
  (e: 'search'): void
}

function closeModal() {
  visible.value = false
}

async function submitForm() {
  try {
    const res = await $api.post(`/policies`, {
      ...formModel.value,
      policy: formModel.value.policy || '{}'
    })
    message.success('修改成功')
    closeModal()
    emit('search')
  } catch (error) {
    message.error('修改失败')
  }
}
</script>

<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    title="修改策略"
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
        <n-form-item-grid-item :span="24" label="策略原文" path="policy">
          <JsonEditorVue v-model="formModel.policy" />
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

<style scoped></style>
