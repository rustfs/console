<template>
   <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    title="添加分层"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-card v-if="!formData.type">  
      <n-grid  x-gap="12" y-gap="12" :cols="2">
        <n-gi v-for="item in typeOptions">
          <n-card class="cursor-pointer " @click="formData.type=item.value" >
            <div class="flex flex-center leading-8">
              <img :src="item.iconUrl" class="w-8 h-8" /> <span class="ms-2">{{ item.label }}</span>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>
    <n-card v-else>
      <n-card class="mb-4">{{ formData.type }}</n-card>
      <n-form ref="formRef" :model="formData" :rules="rules">
        <!-- 规则类型 -->
        <!-- <n-form-item label="分层类型" path="type">
          <n-select
            v-model:value="formData.type"
            :options="typeOptions"
            placeholder="选择规则类型"
          />
        </n-form-item> -->
      
        <n-form-item label="名称">
          <n-input v-model="formData.name" placeholder="请输入名称" />
        </n-form-item>
        <n-form-item label="Endpoint">
          <n-input v-model="formData.endpoint" placeholder="请输入资endpoint" />
        </n-form-item>
        <n-form-item label="Access Key ">
          <n-input v-model="formData.accesskey" placeholder="请输入Access Key" />
        </n-form-item>
        <n-form-item label="Secret Key ">
          <n-input v-model="formData.secretkey" placeholder="请输入Secret Key" />
        </n-form-item>
        <n-form-item label="存储空间">
          <n-input v-model="formData.bucket" placeholder="请输入存储空间" />
        </n-form-item>
        <n-form-item label="前缀">
          <n-input v-model="formData.prefix" placeholder="请输入前缀" />
        </n-form-item>
        <n-form-item label="地区">
          <n-input v-model="formData.regio" placeholder="请输入地区" />
        </n-form-item>
        <n-space justify="center">
          <n-button @click="handleCancel">取消</n-button>
          <n-button type="primary" @click="handleSave">保存</n-button>
        </n-space>
      </n-form>
    </n-card>
  </n-modal>
</template>

<script setup>
import { ref } from 'vue'
import MinioIcon from '~/assets/svg/rustfs.svg'
import GoogleIcon from '~/assets/svg/google.svg'
import AWSIcon from '~/assets/svg/aws.svg'
import AzureIcon from '~/assets/svg/azure.svg'
import AliyunIcon from '~/assets/svg/aliyun.svg'
import TqyunIcon from '~/assets/svg/tenxunyun.svg'
import HwcloudIcon from '~/assets/svg/huaweiyun.svg'
import BaiduIcon from '~/assets/svg/baiduyun.svg'
import {
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
} from 'naive-ui'

const formRef = ref(null)
const formData = ref({
  type:'',
  name: '',
  endpoint: '',
  accesskey: '',
  secretkey: '',
  bucket: '',
  prefix: '',
  regio: '',
})
const typeOptions = [
  { label: 'Minio', value: 'rustfs' ,iconUrl: MinioIcon},
  { label: 'Google Cloue Storage', value: 'google',iconUrl: GoogleIcon },
  { label: 'AWS S3', value: 'AWS' ,iconUrl: AWSIcon},
  { label: 'Azure', value: 'azure' ,iconUrl: AzureIcon},
  { label: '阿里云', value: 'aliyun' ,iconUrl:AliyunIcon},
  { label: '腾讯云', value: 'tqyun',iconUrl: TqyunIcon },
  { label: '华为云', value: 'hwyun',iconUrl: HwcloudIcon },
  { label: '百度云', value: 'bdyun' ,iconUrl: BaiduIcon},
]


const rules = {
  ruleName: { required: true, message: '请输入规则名称' },
  type: { required: true, message: '请选择规则类型' },
  versionType: { required: true, message: '请选择版本类型' }
}


const visible = ref(false)

const open = () => {
  visible.value = true
}

defineExpose({
  open
})
const handleSave = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      console.log('提交数据:', formData.value)
      // 调用保存接口
    }
  })
}

const handleCancel = () => {
  visible.value = false
  // 取消逻辑
  formData.value.type = ''
}
</script>
