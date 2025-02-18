<template>
  <n-page-header @back="router.back()">
    <template #title>
      对象详情
    </template>
    <template #extra>
      <div class="flex items-center gap-4 ml-auto">
        <n-button @click="() => download()">
          <Icon name="ri:download-line" class="mr-2" />
          <span>下载</span>
        </n-button>

        <n-button @click="() => copySignedUrl()">
          <Icon name="ri:file-copy-line" class="mr-2" />
          <span>复制临时链接</span>
        </n-button>

        <n-button @click="() => showPreview = true">
          <Icon name="ri:eye-line" class="mr-2" />
          <span>预览</span>
        </n-button>

        <n-button>
          <Icon name="ri:price-tag-3-line" class="mr-2" />
          <span>标签</span>
        </n-button>

        <n-popconfirm @positive-click="deleteObject">
          <template #trigger>
            <n-button ghost type="error">
              <Icon name="ri:delete-bin-7-line" class="mr-2" />
              <span>删除</span>
            </n-button>
          </template>
          删除对象 <span class="select-all">{{ key }}</span> ?
        </n-popconfirm>

        <n-button @click="() => refresh()">
          <Icon name="ri:refresh-line" class="mr-2" />
          <span>刷新</span>
        </n-button>
      </div>
    </template>
  </n-page-header>
  <n-card title="对象信息">
    <div v-if="status === 'pending'" class="flex items-center justify-center">
      <n-spin size="small" />
    </div>
    <n-descriptions :column="1">
      <n-descriptions-item label="对象名称"><span class="select-all">{{ key }}</span></n-descriptions-item>
      <n-descriptions-item label="对象大小">{{ object?.ContentLength }}</n-descriptions-item>
      <n-descriptions-item label="对象类型">{{ object?.ContentType }}</n-descriptions-item>
      <!-- <n-descriptions-item label="存储类型">{{ object?.StorageClass }}</n-descriptions-item> -->
      <n-descriptions-item label="ETag"><span class="select-all">{{ object?.ETag }}</span></n-descriptions-item>
      <n-descriptions-item label="最后修改时间">{{ object?.LastModified }}</n-descriptions-item>
    </n-descriptions>

    <object-preview-modal v-model:show="showPreview" :bucketName="bucketName" :objectKey="key" />
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const router = useRouter()
const { $s3Client } = useNuxtApp();
const message = useMessage();
const props = defineProps<{ bucket: string; objectKey: string }>()

const bucketName = computed(() => props.bucket as string)

// 当前路径的前缀, example: '/folder1/folder2/'
const key = computed(() => decodeURIComponent(props.objectKey as string))

// 预览内容
const showPreview = ref(false)

const objectApi = useObject({ bucket: bucketName.value });

// 在服务端获取数据
const { data: object, status, refresh } = useAsyncData(`head-object&${key}`, () => objectApi.headObject(key.value))

const download = async () => {
  const msg = message.loading('正在获取下载链接...');
  const url = await objectApi.getSignedUrl(key.value);
  msg.destroy();
  window.open(url, '_blank')
}

const copySignedUrl = async () => {
  const msg = message.loading('正在获取下载链接...');
  const url = await objectApi.getSignedUrl(key.value);
  await navigator.clipboard.writeText(url);
  msg.destroy();
  message.success('链接已复制到剪贴板');
}
const deleteObject = async () => {
  await objectApi.deleteObject(key.value);
  message.success('删除成功');
  router.back();
}


</script>
