<template>
  <AppModal v-model="visible" :title="t('Add Tier')" size="lg" :close-on-backdrop="false">
    <div class="space-y-6">
      <div v-if="!formData.type" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AppCard
          v-for="item in typeOptions"
          :key="item.value"
          class="cursor-pointer border border-border/70 transition hover:border-primary"
          @click="chooseType(item.value)"
        >
          <div class="flex items-center gap-3">
            <img :src="item.iconUrl" class="h-10 w-10" alt="" />
            <div>
              <p class="text-base font-semibold">{{ item.label }}</p>
              <p class="text-sm text-muted-foreground">{{ item.description }}</p>
            </div>
          </div>
        </AppCard>
      </div>

      <div v-else class="space-y-5">
        <AppCard class="cursor-pointer border transition hover:border-primary" @click="resetType">
          <div class="flex items-center gap-3">
            <img :src="iconUrl" class="h-10 w-10" alt="" />
            <div>
              <p class="text-sm text-muted-foreground">{{ t('Selected Type') }}</p>
              <p class="text-base font-semibold">{{ formData.type }}</p>
            </div>
          </div>
        </AppCard>

        <AppCard padded class="space-y-4">
          <div class="grid gap-2">
            <Label>{{ t('Name') }} (A-Z,0-9,_)</Label>
            <Input
              v-model="formData.name"
              :placeholder="t('Please enter name')"
              autocomplete="off"
              @input="filterName"
            />
            <p v-if="errors.name" class="text-sm text-destructive">{{ errors.name }}</p>
          </div>

          <div class="grid gap-2">
            <Label>{{ t('Endpoint') }}</Label>
            <Input v-model="formData.endpoint" :placeholder="t('Please enter endpoint')" />
          </div>

          <div class="grid gap-2">
            <Label>{{ t('Access Key') }}</Label>
            <Input v-model="formData.accesskey" :placeholder="t('Please enter Access Key')" autocomplete="off" />
          </div>

          <div class="grid gap-2">
            <Label>{{ t('Secret Key') }}</Label>
            <Input v-model="formData.secretkey" type="password" autocomplete="off" :placeholder="t('Please enter Secret Key')" />
          </div>

          <div class="grid gap-2">
            <Label>{{ t('Bucket') }}</Label>
            <Input v-model="formData.bucket" :placeholder="t('Please enter bucket')" />
          </div>

          <div class="grid gap-2">
            <Label>{{ t('Prefix') }}</Label>
            <Input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
          </div>

          <div class="grid gap-2">
            <Label>{{ t('Region') }}</Label>
            <Input v-model="formData.region" :placeholder="t('Please enter region')" />
          </div>

          <div class="grid gap-2">
            <Label>{{ t('Storage Class') }}</Label>
            <Input v-model="formData.storageclass" :placeholder="t('Please Enter storage class')" />
          </div>
        </AppCard>
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
  </AppModal>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { AppCard, AppModal } from '@/components/app'
import { Label } from '@/components/ui/label'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MinioIcon from '~/assets/svg/minio.svg'
import AWSIcon from '~/assets/svg/aws.svg'
import RustfsIcon from '~/assets/logo.svg'

const { t } = useI18n()
const usetier = useTiers()
const message = useMessage()

const typeOptions = [
  { label: t('RustFS'), value: 'rustfs', iconUrl: RustfsIcon, description: t('RustFS built-in cold storage') },
  { label: t('Minio'), value: 'minio', iconUrl: MinioIcon, description: t('External MinIO tier') },
  { label: t('AWS S3'), value: 's3', iconUrl: AWSIcon, description: t('Standard AWS S3 tier') },
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
  bucket: '',
  prefix: '',
  region: '',
  storageclass: 'STANDARD',
})

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
    const payload = {
      type: formData.type,
      [formData.type]: {
        name: formData.name,
        endpoint: formData.endpoint,
        bucket: formData.bucket,
        prefix: formData.prefix,
        region: formData.region,
        accessKey: formData.accesskey,
        secretKey: formData.secretkey,
        storageClass: formData.storageclass,
      },
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