<template>
  <n-modal v-model:show="visible" :mask-closable="false" preset="card" :title="t('Subscribe to event notification') + ` (${t('Bucket')}: ${bucketName})`" class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-card>
      <n-form :model="formData" label-placement="left" label-width="120px">
        <n-form-item :label="t('Amazon Resource Name')">
          <n-input v-model="formData.resourceName" :placeholder="t('Please enter resource name')" />
        </n-form-item>

        <n-form-item :label="t('Prefix')">
          <n-input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
        </n-form-item>

        <n-form-item :label="t('Suffix')">
          <n-input v-model="formData.suffix" :placeholder="t('Please enter suffix')" />
        </n-form-item>

        <n-form-item :label="t('Select events')">
          <n-scrollbar class="w-full max-h-64">
            <n-checkbox-group v-model="formData.events" class="flex flex-col">
              <n-checkbox class="mt-2" value="PUT" :label="t('PUT - Object upload')" />
              <n-checkbox class="mt-2" value="GET" :label="t('GET - Object access')" />
              <n-checkbox class="mt-2" value="DELETE" :label="t('DELETE - Object deletion')" />
              <n-checkbox class="mt-2" value="REPLICA" :label="t('REPLICA - Object migration')" />
              <n-checkbox class="mt-2" value="RESTORE" :label="t('ILM - Object converted')" />
              <n-checkbox class="mt-2" value="SCANNER" :label="t('SCANNER - Object has too many versions/prefix has too many subfolders')" />
            </n-checkbox-group>
          </n-scrollbar>
        </n-form-item>

        <n-space justify="center">
          <n-button @click="handleCancel">{{ t('Cancel') }}</n-button>
          <n-button type="primary" @click="handleSubmit">{{ t('Save') }}</n-button>
        </n-space>
      </n-form>
    </n-card>
  </n-modal>
</template>

<script setup>
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
} from 'naive-ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const formRef = ref(null)
const formData = ref({
  resourceName: '',
  prefix: '',
  suffix: '',
  events: []
})

const props = defineProps({
  bucketName: {
    type: String,
    required: true
  }
})

const visible = ref(false)
const open = () => {
  visible.value = true
}

defineExpose({
  open
})
const handleSubmit = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      console.log('提交数据:', formData.value)
      // 调用保存接口
    }
  })
}

const handleCancel = () => {
  // 取消逻辑
  visible.value = false
}
</script>
