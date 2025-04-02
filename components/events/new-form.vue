<template>
   <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    :title="`订阅事件通知（桶：${bucketName}）`"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-card>
   <n-form :model="formData" label-placement="left" label-width="120px">
    <n-form-item label="Amazon资源名">
      <n-input v-model="formData.resourceName" placeholder="请输入资源名" />
    </n-form-item>
 
    <n-form-item label="前缀">
      <n-input v-model="formData.prefix" placeholder="请输入前缀" />
    </n-form-item>
 
    <n-form-item label="后缀">
      <n-input v-model="formData.suffix" placeholder="请输入后缀" />
    </n-form-item>
 
    <n-form-item label="Select 事件">
       <n-scrollbar  class="w-full max-h-64"> 
        <n-checkbox-group v-model="formData.events" class="flex  flex-col ">
          <n-checkbox class="mt-2" value="PUT" label="PUT - 对象上传" />
          <n-checkbox class="mt-2"  value="GET" label="GET - 对象访问" />
          <n-checkbox class="mt-2" value="DELETE" label="DELETE - 对象删除" />
          <n-checkbox class="mt-2" value="REPLICA" label="REPLICA - 对象迁移" />
          <n-checkbox class="mt-2" value="RESTORE" label="ILM - 对象已转换" />
          <n-checkbox class="mt-2" value="SCANNER" label="SCANNER - 对象有太多版本/前缀有太多子文件夹" />
        </n-checkbox-group>
       </n-scrollbar>
    </n-form-item>
 
    <n-space justify="center">
      <n-button @click="handleCancel">取消</n-button>
      <n-button type="primary" @click="handleSubmit">保存</n-button>
    </n-space>
  </n-form>
  </n-card>
  </n-modal>
</template>

<script setup>
import { ref } from 'vue'
import {
  NForm,
  NFormItem,
  NInput,
  NButton,
} from 'naive-ui'

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
