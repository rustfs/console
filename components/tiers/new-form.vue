<template>
  <n-modal v-model:show="visible" :mask-closable="false" preset="card" :title="t('Add Tier')" class="max-w-screen-md" :segmented="{
    content: true,
    action: true,
  }">
    <n-card v-if="!formData.type">
      <n-grid x-gap="12" y-gap="12" :cols="2">
        <n-gi v-for="item in typeOptions">
          <n-card class="cursor-pointer " @click="formData.type = item.value">
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

        <n-form-item :label="t('Name')">
          <n-input v-model="formData.name" :placeholder="t('Please enter name')" />
        </n-form-item>
        <n-form-item :label="t('Endpoint')">
          <n-input v-model="formData.endpoint" :placeholder="t('Please enter endpoint')" />
        </n-form-item>
        <n-form-item :label="t('Access Key')">
          <n-input v-model="formData.accesskey" :placeholder="t('Please enter Access Key')" />
        </n-form-item>
        <n-form-item :label="t('Secret Key')">
          <n-input v-model="formData.secretkey" :placeholder="t('Please enter Secret Key')" />
        </n-form-item>
        <n-form-item :label="t('Bucket')">
          <n-input v-model="formData.bucket" :placeholder="t('Please enter bucket')" />
        </n-form-item>
        <n-form-item :label="t('Prefix')">
          <n-input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
        </n-form-item>
        <n-form-item :label="t('Region')">
          <n-input v-model="formData.regio" :placeholder="t('Please enter region')" />
        </n-form-item>
        <n-space justify="center">
          <n-button @click="handleCancel">{{ t('Cancel') }}</n-button>
          <n-button type="primary" @click="handleSave">{{ t('Save') }}</n-button>
        </n-space>
      </n-form>
    </n-card>
  </n-modal>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()

const formRef = ref(null)
const formData = ref({
  type: '',
  name: '',
  endpoint: '',
  accesskey: '',
  secretkey: '',
  bucket: '',
  prefix: '',
  regio: '',
})
const typeOptions = [
  { label: t('Minio'), value: 'rustfs', iconUrl: MinioIcon },
  { label: t('Google Cloud Storage'), value: 'google', iconUrl: GoogleIcon },
  { label: t('AWS S3'), value: 'AWS', iconUrl: AWSIcon },
  { label: t('Azure'), value: 'azure', iconUrl: AzureIcon },
  { label: t('Aliyun'), value: 'aliyun', iconUrl: AliyunIcon },
  { label: t('Tencent Cloud'), value: 'tqyun', iconUrl: TqyunIcon },
  { label: t('Huawei Cloud'), value: 'hwyun', iconUrl: HwcloudIcon },
  { label: t('Baidu Cloud'), value: 'bdyun', iconUrl: BaiduIcon },
]

const rules = {
  ruleName: { required: true, message: t('Please enter rule name') },
  type: { required: true, message: t('Please select rule type') },
  versionType: { required: true, message: t('Please select version type') }
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
      console.log(t('Submit data'), formData.value)
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
