<template>
  <Modal v-model="visible" :title="t('Add Tier')" size="lg" :close-on-backdrop="false">
    <div class="space-y-6">
      <div v-if="!formData.type" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          v-for="item in typeOptions"
          :key="item.value"
          class="cursor-pointer border border-border/70 transition hover:border-primary"
          @click="chooseType(item.value)"
        >
          <div class="flex items-center gap-3 p-4">
            <img :src="item.iconUrl" class="h-10 w-10" alt="" />
            <div>
              <p class="text-base font-semibold">{{ item.label }}</p>
              <p class="text-sm text-muted-foreground">{{ item.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="space-y-5">
        <div class="cursor-pointer border transition hover:border-primary" @click="resetType">
          <div class="flex items-center gap-3 p-4">
            <img :src="iconUrl" class="h-10 w-10" alt="" />
            <div>
              <p class="text-sm text-muted-foreground">{{ t('Selected Type') }}</p>
              <p class="text-base font-semibold">{{ formData.type }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel>{{ t('Name') }} (A-Z,0-9,_)</FieldLabel>
            <FieldContent>
              <Input
                v-model="formData.name"
                :placeholder="t('Please enter name')"
                autocomplete="off"
                @input="filterName"
              />
            </FieldContent>
            <FieldDescription v-if="errors.name" class="text-destructive">
              {{ errors.name }}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{{ t('Endpoint') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.endpoint" :placeholder="t('Please enter endpoint')" />
            </FieldContent>
          </Field>

          <template v-if="isGCS">
            <Field>
              <FieldLabel>{{ t('Credentials') }} (JSON)</FieldLabel>
              <FieldContent>
                <Textarea
                  v-model="formData.creds"
                  :placeholder="t('Please enter GCS credentials JSON')"
                  autocomplete="off"
                  :rows="6"
                />
              </FieldContent>
            </Field>
          </template>

          <template v-else>
            <Field>
              <FieldLabel>{{ t('Access Key') }}</FieldLabel>
              <FieldContent>
                <Input v-model="formData.accesskey" :placeholder="t('Please enter Access Key')" autocomplete="off" />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{{ t('Secret Key') }}</FieldLabel>
              <FieldContent>
                <Input
                  v-model="formData.secretkey"
                  type="password"
                  autocomplete="off"
                  :placeholder="t('Please enter Secret Key')"
                />
              </FieldContent>
            </Field>
          </template>

          <Field>
            <FieldLabel>{{ t('Bucket') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.bucket" :placeholder="t('Please enter bucket')" />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{{ t('Prefix') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{{ t('Region') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.region" :placeholder="t('Please enter region')" />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{{ t('Storage Class') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formData.storageclass" :placeholder="t('Please Enter storage class')" />
            </FieldContent>
          </Field>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="handleCancel">{{ t('Cancel') }}</Button>
        <Button variant="default" :disabled="!formData.type" :loading="submitting" @click="handleSave">
          {{ t('Save') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { reactive, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RustfsIcon from '~/assets/logo.svg'
import AWSIcon from '~/assets/svg/aws.svg'
import MinioIcon from '~/assets/svg/minio.svg'
import AliyunIcon from '~/assets/svg/aliyun.svg'
import TencentIcon from '~/assets/svg/tenxunyun.svg'
import HuaweiIcon from '~/assets/svg/huaweiyun.svg'
import AzureIcon from '~/assets/svg/azure.svg'
import GoogleIcon from '~/assets/svg/google.svg'
import CloudflareIcon from '~/assets/svg/cloudflare.svg'
import Modal from '~/components/modal.vue'

const { t } = useI18n()
const usetier = useTiers()
const message = useMessage()

const typeOptions = [
  { label: t('RustFS'), value: 'rustfs', iconUrl: RustfsIcon, description: t('RustFS built-in cold storage') },
  { label: t('Minio'), value: 'minio', iconUrl: MinioIcon, description: t('External MinIO tier') },
  { label: t('AWS S3'), value: 's3', iconUrl: AWSIcon, description: t('Standard AWS S3 tier') },
  {
    label: t('Aliyun OSS'),
    value: 'aliyun',
    iconUrl: AliyunIcon,
    description: t('Alibaba Cloud Object Storage Service'),
  },
  { label: t('Tencent COS'), value: 'tencent', iconUrl: TencentIcon, description: t('Tencent Cloud Object Storage') },
  {
    label: t('Huawei OBS'),
    value: 'huaweicloud',
    iconUrl: HuaweiIcon,
    description: t('Huawei Cloud Object Storage Service'),
  },
  { label: t('Azure Blob'), value: 'azure', iconUrl: AzureIcon, description: t('Microsoft Azure Blob Storage') },
  { label: t('Google Cloud Storage'), value: 'gcs', iconUrl: GoogleIcon, description: t('Google Cloud Storage') },
  { label: t('Cloudflare R2'), value: 'r2', iconUrl: CloudflareIcon, description: t('Cloudflare R2 Storage') },
]

const visible = ref(false)
const submitting = ref(false)
const iconUrl = ref(RustfsIcon)

const formData = reactive({
  type: '',
  name: '',
  endpoint: '',
  accesskey: '',
  secretkey: '',
  creds: '',
  bucket: '',
  prefix: '',
  region: '',
  storageclass: 'STANDARD',
})

const isGCS = computed(() => formData.type === 'gcs')

const errors = reactive({
  name: '',
})

const chooseType = (type: string) => {
  formData.type = type
  iconUrl.value = typeOptions.find(item => item.value === type)?.iconUrl || RustfsIcon
}

const resetType = () => {
  formData.type = ''
  iconUrl.value = RustfsIcon
  resetForm()
}

const filterName = () => {
  formData.name = formData.name.replace(/[^A-Za-z0-9_]/g, '').toUpperCase()
}

const resetForm = () => {
  formData.name = ''
  formData.endpoint = ''
  formData.accesskey = ''
  formData.secretkey = ''
  formData.creds = ''
  formData.bucket = ''
  formData.prefix = ''
  formData.region = ''
  formData.storageclass = 'STANDARD'
  errors.name = ''
}

const validate = () => {
  if (!formData.type) {
    message.error(t('Please select rule type'))
    return false
  }
  if (!formData.name) {
    errors.name = t('Please enter rule name')
    return false
  }
  errors.name = ''
  return true
}

const emit = defineEmits<{
  (e: 'search'): void
}>()

const handleSave = async () => {
  if (!validate()) return
  submitting.value = true
  try {
    const config: any = {
      name: formData.name,
      endpoint: formData.endpoint,
      bucket: formData.bucket,
      prefix: formData.prefix,
      region: formData.region,
      storageClass: formData.storageclass,
    }

    if (isGCS.value) {
      config.creds = formData.creds
    } else {
      config.accessKey = formData.accesskey
      config.secretKey = formData.secretkey
    }

    const payload = {
      type: formData.type,
      [formData.type]: config,
    }

    await usetier.addTiers(payload)
    message.success(t('Create Success'))
    emit('search')
    handleCancel()
  } catch (error: any) {
    message.error(error?.message || t('Create Failed'))
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  visible.value = false
  submitting.value = false
  resetForm()
}

defineExpose({
  open: () => {
    visible.value = true
    resetForm()
  },
})
</script>
