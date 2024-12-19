<template>
  <n-page-header :subtitle="key" @back="router.back()">
    <template #title>
      对象详情
    </template>
    <template #extra>
      <div class="flex items-center gap-4 ml-auto">
        <n-button>
          <Icon name="ri:download-line" class="mr-2" />
          <span>下载</span>
        </n-button>
        <n-button>
          <Icon name="ri:file-copy-line" class="mr-2" />
          <span>复制临时链接</span>
        </n-button>
        <n-button>
          <Icon name="ri:eye-line" class="mr-2" />
          <span>预览</span>
        </n-button>
        <n-button>
          <Icon name="ri:price-tag-3-line" class="mr-2" />
          <span>标签</span>
        </n-button>
        <n-button @click="() => refresh()">
          <Icon name="ri:refresh-line" class="mr-2" />
          <span>刷新</span>
        </n-button>
      </div>
    </template>
  </n-page-header>
  <n-card title="对象信息">
    <n-descriptions :column="1">
      <n-descriptions-item label="对象名称">{{ key }}</n-descriptions-item>
      <n-descriptions-item label="对象大小">{{ object?.ContentLength }}</n-descriptions-item>
      <n-descriptions-item label="对象类型">{{ object?.ContentType }}</n-descriptions-item>
      <!-- <n-descriptions-item label="存储类型">{{ object?.StorageClass }}</n-descriptions-item> -->
      <n-descriptions-item label="ETag">{{ object?.ETag }}</n-descriptions-item>
      <n-descriptions-item label="最后修改时间">{{ object?.LastModified }}</n-descriptions-item>
    </n-descriptions>
  </n-card>
</template>

<script setup lang="ts">


import { useAsyncData } from '#app'
import { HeadObjectCommand, type HeadObjectCommandOutput } from '@aws-sdk/client-s3'
import { computed } from 'vue'

const router = useRouter()
const { $s3Client } = useNuxtApp();
const props = defineProps<{ bucket: string; objectKey: string }>()

const bucketName = computed(() => props.bucket as string)

// 当前路径的前缀, example: '/folder1/folder2/'
const key = computed(() => decodeURIComponent(props.objectKey as string))

// 在服务端获取数据
const { data: object, refresh } = await useAsyncData<HeadObjectCommandOutput>(`object-detail&${key}`, async () => {
  const params = {
    Bucket: bucketName.value,
    Key: key.value
  }

  return await $s3Client.send(new HeadObjectCommand(params))
})

console.log(object);



</script>
