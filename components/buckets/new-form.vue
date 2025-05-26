<template>
  <n-modal :show="show" @update:show="(val: boolean) => $emit('update:show', val)" size="huge">
    <n-card class="max-w-screen-sm">
      <template #header>
        <div style="display:flex; justify-content: space-between; align-items:center;">
          <span>{{ t('Create Bucket') }}</span>
          <n-button size="small" ghost @click="closeModal">{{ t('Close') }}</n-button>
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <!-- <div class="flex items-center gap-4">
          <div>新建存储桶</div>
          <div class="text-cyan-600">{{ bucketName }}{{ prefix || '/' }}</div>
        </div> -->

        <!-- <n-alert title="" type="info">
          若上传路径中存在同名文件，上传将覆盖原有文件。
        </n-alert> -->

        <div class="flex items-center gap-4">
          <n-input :placeholder="t('Please enter name')" v-model:value="objectKey" />
        </div>
         <div class="flex items-center gap-4">
          <n-space class=" w-12">{{ t('Version') }}:</n-space>
           <n-switch v-model:value="version" @change="handleVersionChange"/>  
        </div>
         <div class="flex items-center gap-4">
          <n-space class=" w-12">{{ t('Object Lock') }}:</n-space>
          <n-switch v-model:value="objectLock" @change="handleObjectLock"/>
        </div>

        <div class="flex justify-center gap-4">
          <n-button type="primary" :disabled="objectKey.trim().length < 1" @click="handlePutObject">{{ t('Create') }}</n-button>
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { defineEmits, defineProps } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const emit = defineEmits(['update:show'])

const props = defineProps<{ show: boolean; }>()

const closeModal = () => emit('update:show', false)

const objectKey = ref('')
const version = ref(false)
const objectLock = ref(false)

const { createBucket ,putBucketVersioning} = useBucket({})

const $message = useMessage()

// 如果开启对象锁，必须开启版本控制
const handleObjectLock = () => {
  if (objectLock.value) {
    version.value = true
  } 
}

// 如果关闭版本控制，关闭对象锁
const handleVersionChange = () => {
  if (!version.value) {
    objectLock.value = false
  }
 }

const handlePutObject = () => {
  const params = {
    Bucket: objectKey.value,
    ObjectLockEnabledForBucket: objectLock.value,
  }
  createBucket(params).then(() => {
    // 开启版本控制
    if (version.value) {
      putBucketVersioning(
        objectKey.value,
        version.value?"Enabled":"Suspended",
      ).then(() => {
        emit('update:show', false)
        objectKey.value = ''
        $message.success(t('Create Success'))
      }).catch((e) => {
        $message.error(t('Create Failed'))
      })
    }else {
      emit('update:show', false)
      objectKey.value = ''
      $message.success(t('Create Success'))
    }
   
  }).catch((e) => {
    $message.error(e.message)
  })
}
</script>
