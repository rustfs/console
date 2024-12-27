<template>
  <n-modal :show="show" @update:show="val => $emit('update:show', val)" size="huge">
    <n-card class="max-w-screen-sm">
      <template #header>
        <div style="display:flex; justify-content: space-between; align-items:center;">
          <span>新建存储桶</span>
          <n-button size="small" ghost @click="closeModal">关闭</n-button>
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
          <n-input :placeholder="`请输入名称`" v-model:value="objectKey" />
        </div>

        <div class="flex justify-center gap-4">
          <n-button type="primary" :disabled="objectKey.trim().length < 1" @click="handlePutObject">创建</n-button>
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { defineEmits, defineProps } from 'vue'
const emit = defineEmits(['update:show'])

const props = defineProps<{ show: boolean; }>()

const closeModal = () => emit('update:show', false)

const objectKey = ref('')

const { createBucket } = useBucket({})

const $message = useMessage()

const handlePutObject = () => {
  createBucket(objectKey.value).then(() => {
    emit('update:show', false)
    objectKey.value = ''
    $message.success('创建成功')
  }).catch((e) => {
    $message.error(e.message)
  })
}
</script>
