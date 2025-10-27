<template>
  <AppModal v-model="visible" :title="t('New user has been created')" size="md" :close-on-backdrop="false">
    <AppCard padded class="space-y-4">
      <div class="space-y-2">
        <Label>{{ t('Access Key') }}</Label>
        <copy-input v-model="accessKey" class="w-full" :readonly="true" :copy-icon="true" />
      </div>
      <div class="space-y-2">
        <Label>{{ t('Secret Key') }}</Label>
        <copy-input v-model="secretkey" class="w-full" :readonly="true" :copy-icon="true" />
      </div>
    </AppCard>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="closeModal">{{ t('Cancel') }}</Button>
        <Button variant="default" @click="exportFile">{{ t('Export') }}</Button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

import { AppCard, AppModal } from '@/components/app'
import { Label } from '@/components/ui/label'
import { download } from '@/utils/export-file'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const visible = ref(false)

const accessKey = ref('')
const secretkey = ref('')
const url = ref('')

const emit = defineEmits<{
  (e: 'search'): void
}>()

const openDialog = (data: any) => {
  accessKey.value = data.credentials.accessKey
  secretkey.value = data.credentials.secretKey
  url.value = data.url
  visible.value = true
}

const closeModal = () => {
  visible.value = false
  accessKey.value = ''
  secretkey.value = ''
  emit('search')
}

const exportFile = () => {
  download(
    'credentials.json',
    JSON.stringify({
      url: url.value,
      accessKey: accessKey.value,
      secretKey: secretkey.value,
      api: 's3v4',
      path: 'auto',
    })
  )
}

defineExpose({
  openDialog,
})
</script>