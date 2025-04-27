<template>
  <n-modal :show="show" @update:show="(val: boolean) => $emit('update:show', val)" size="huge">
    <n-card class="max-w-screen-md">
      <template #header>
        <div style="display:flex; justify-content: space-between; align-items:center;">
          <span>{{ t('New Form', { type: displayType }) }}</span>
          <n-button size="small" ghost @click="closeModal">{{ t('Close') }}</n-button>
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <!-- <div class="flex items-center gap-4">
          <div>新建{{ displayType }}</div>
          <div class="text-cyan-600">{{ bucketName }}{{ prefix || '/' }}</div>
        </div> -->

        <n-alert title="" type="info">
          {{ t('Overwrite Warning') }}
        </n-alert>

        <div class="flex items-center gap-4">
          <n-input :placeholder="t('Name Placeholder', { type: displayType })" v-model:value="objectKey" />
        </div>

        <div class="flex justify-center gap-4">
          <n-button type="primary" :disabled="objectKey.trim().length < 1" @click="handlePutObject">{{ t('Create') }}</n-button>
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { joinRelativeURL } from 'ufo'
import { computed, defineEmits, defineProps } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emit = defineEmits(['update:show'])

const props = defineProps<{ show: boolean; bucketName: string; prefix: string, asPrefix?: boolean }>()

const closeModal = () => emit('update:show', false)

const displayType = computed(() => props.asPrefix ? t('New Folder') : t('New File'))

const objectKey = ref('')

const { putObject } = useObject({ bucket: props.bucketName })

const $message = useMessage()

const handlePutObject = () => {
  const suffix = props.asPrefix ? '/' : ''
  putObject(joinRelativeURL(props.prefix, objectKey.value, suffix), '').then(() => {
    emit('update:show', false)
    objectKey.value = ''
    $message.success(t('Create Success'))
  }).catch((e) => {
    $message.error(e.message)
  })
}
</script>
