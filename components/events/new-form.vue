<template>
   <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    title="订阅事件通知"
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
      <n-layout content-style="padding: 24px;" class="max-h-64 overflow-y-scroll" :native-scrollbar="false">
        <n-checkbox-group v-model="formData.events" class="flex flex-wrap flex-col ">
          <n-checkbox value="PUT" label="PUT - 对象上传" />
          <n-checkbox  value="GET" label="GET - 对象访问" />
          <n-checkbox value="DELETE" label="DELETE - 对象删除" />
          <n-checkbox value="REPLICA" label="REPLICA - 对象迁移" />
          <n-checkbox value="RESTORE" label="ILM - 对象已转换" />
          <n-checkbox value="SCANNER" label="SCANNER - 对象有太多版本/前缀有太多子文件夹" />
        </n-checkbox-group>
       </n-layout>
     
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
