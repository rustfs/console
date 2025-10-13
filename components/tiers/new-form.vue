<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    :title="t('Add Tier')"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-card v-show="!formData.type">
      <n-grid x-gap="12" y-gap="12" :cols="2">
        <n-gi v-for="item in typeOptions">
          <n-card class="cursor-pointer" @click="chooseType(item.value)">
            <div class="flex flex-center leading-8">
              <img :src="item.iconUrl" class="w-8 h-8" />
              <span class="ms-2">{{ item.label }}</span>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>
    <n-card v-show="formData.type">
      <n-card class="mb-4">
        <div class="flex flex-center leading-8" @click="formData.type = ''">
          <img :src="iconUrl" class="w-8 h-8" />
          <span class="ms-2"> {{ formData.type }}</span>
        </div>
      </n-card>
      <n-form ref="formRef" :model="formData" :rules="rules">
        <!-- 规则类型 -->
        <!-- <n-form-item label="分层类型" path="type">
          <n-select
            v-model:value="formData.type"
            :options="typeOptions"
            placeholder="选择规则类型"
          />
        </n-form-item> -->

        <n-form-item :label="t('Name') + '(A-Z,0-9,_)'">
          <n-input
            v-model:value="formData.name"
            :allow-input="
              value => {
                // 只允许字母、数字、下划线
                return /^[A-Za-z0-9_]*$/.test(value);
              }
            "
            :placeholder="t('Please enter name')"
            @input="
              val => {
                // 只将字母转为大写，数字和下划线不变
                formData.name = val.replace(/[a-z]/g, c => c.toUpperCase());
              }
            "
          />
        </n-form-item>
        <n-form-item :label="t('Endpoint')">
          <n-input v-model:value="formData.endpoint" :placeholder="t('Please enter endpoint')" />
        </n-form-item>
        <n-form-item :label="t('Access Key')">
          <n-input v-model:value="formData.accesskey" :placeholder="t('Please enter Access Key')" />
        </n-form-item>
        <n-form-item :label="t('Secret Key')">
          <n-input v-model:value="formData.secretkey" :placeholder="t('Please enter Secret Key')" />
        </n-form-item>
        <n-form-item :label="t('Bucket')">
          <n-input v-model:value="formData.bucket" :placeholder="t('Please enter bucket')" />
        </n-form-item>
        <n-form-item :label="t('Prefix')">
          <n-input v-model:value="formData.prefix" :placeholder="t('Please enter prefix')" />
        </n-form-item>
        <n-form-item :label="t('Region')">
          <n-input v-model:value="formData.region" :placeholder="t('Please enter region')" />
        </n-form-item>
        <n-form-item :label="t('StorageClass')">
          <n-input v-model:value="formData.storageclass" :placeholder="t('Please Enter storage class')" />
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
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MinioIcon from '~/assets/svg/minio.svg';
import GoogleIcon from '~/assets/svg/google.svg';
import AWSIcon from '~/assets/svg/aws.svg';
import AzureIcon from '~/assets/svg/azure.svg';
import AliyunIcon from '~/assets/svg/aliyun.svg';
import TqyunIcon from '~/assets/svg/tenxunyun.svg';
import HwcloudIcon from '~/assets/svg/huaweiyun.svg';
import BaiduIcon from '~/assets/svg/baiduyun.svg';
import RustfsIcon from '~/assets/logo.svg';
import { NForm, NFormItem, NInput, NSelect, NButton } from 'naive-ui';
import { useTiers } from '#imports';

const { t } = useI18n();
const usetier = useTiers();
const message = useMessage();

// 支持的存储类型
const typeOptions = [
  { label: t('RustFS'), value: 'rustfs', iconUrl: RustfsIcon },
  { label: t('Minio'), value: 'minio', iconUrl: MinioIcon },
  { label: t('AWS S3'), value: 's3', iconUrl: AWSIcon },
  // 暂未支持
  // { label: t('Google Cloud Storage'), value: 'google', iconUrl: GoogleIcon },
  // { label: t('Azure'), value: 'azure', iconUrl: AzureIcon },
  // { label: t('Aliyun'), value: 'aliyun', iconUrl: AliyunIcon },
  // { label: t('Tencent Cloud'), value: 'tqyun', iconUrl: TqyunIcon },
  // { label: t('Huawei Cloud'), value: 'hwyun', iconUrl: HwcloudIcon },
  // { label: t('Baidu Cloud'), value: 'bdyun', iconUrl: BaiduIcon },
];

const formRef = ref(null);
const formData = ref({
  type: '',
  name: '',
  endpoint: '',
  accesskey: '',
  secretkey: '',
  bucket: '',
  prefix: '',
  region: '',
  storageclass: 'STANDARD', // 新增字段，默认值为 STANDARD
});
const iconUrl = ref(MinioIcon);

const chooseType = type => {
  formData.value.type = type;
  iconUrl.value = typeOptions.find(item => item.value === type)?.iconUrl || '';
};

const rules = {
  name: { required: true, message: t('Please enter rule name') },
  type: { required: true, message: t('Please select rule type') },
  versionType: { required: true, message: t('Please select version type') },
};

const visible = ref(false);

const open = () => {
  visible.value = true;
};

defineExpose({
  open,
});

const emmit = defineEmits(['search']);
const handleSave = () => {
  formRef.value?.validate(errors => {
    if (!errors) {
      // {"type":"minio","minio":{"name":"COLDTIER","endpoint":"","bucket":"","prefix":"","region":"","accesskey":"","secretkey":""}}
      // 调用保存接口
      const data = {
        type: formData.value.type,
        [formData.value.type]: {
          name: formData.value.name,
          endpoint: formData.value.endpoint,
          bucket: formData.value.bucket,
          prefix: formData.value.prefix,
          region: formData.value.region,
          accessKey: formData.value.accesskey,
          secretKey: formData.value.secretkey,
          storageClass: formData.value.storageclass, // 新增字段
        },
      };
      usetier
        .addTiers(data)
        .then(res => {
          visible.value = false;
          emmit('search');
          message.success(t('Create Success'));
        })
        .catch(err => {
          message.error(err.message);
        });
    }
  });
};

const handleCancel = () => {
  visible.value = false;
  // 取消逻辑
  formData.value.type = '';
};
</script>
