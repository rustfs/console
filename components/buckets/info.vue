<template>
  <n-page-header @back="router.back()">
    <template #title>桶信息详情</template>
    <template #extra>
      <div class="flex items-center gap-4 ml-auto">
        <n-button @click="">
          <Icon name="ri:calendar-event-line" class="mr-2" />
          <span>事件</span>
        </n-button>

        <n-button @click="">
          <Icon name="ri:file-copy-line" class="mr-2" />
          <span>副本</span>
        </n-button>

        <n-button>
          <Icon name="ri:exchange-2-line" class="mr-2" />
          <span>生命周期</span>
        </n-button>

        <n-button>
          <Icon name="ri:key-2-line" class="mr-2" />
          <span>访问权限</span>
        </n-button>

        <n-button>
          <Icon name=" ri:surgical-mask-line" class="mr-2" />
          <span>匿名访问</span>
        </n-button>

        <n-popconfirm @positive-click="">
          <template #trigger>
            <n-button ghost type="error">
              <Icon name="ri:delete-bin-7-line" class="mr-2" />
              <span>删除</span>
            </n-button>
          </template>
          删除存储桶
          <span class="select-all">{{}}</span>
          ?
        </n-popconfirm>

        <n-button @click="() => refresh()">
          <Icon name="ri:refresh-line" class="mr-2" />
          <span>刷新</span>
        </n-button>
      </div>
    </template>
  </n-page-header>
  <n-card title="桶摘要">
    <div v-if="status === 'pending'" class="flex items-center justify-center">
      <n-spin size="small" />
    </div>
    <n-descriptions :column="2">
      <n-descriptions-item label="桶名称">
        <span class="select-all">{{ bucketName }}</span>
      </n-descriptions-item>
      <n-descriptions-item class="font-bold">
        <template #label>
          当前状态
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        {{ 111 }}
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          访问策略
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        {{ 111 }}
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          加密
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        {{ object?.ContentType }}
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          使用情况报告
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        {{ object?.ContentType }}
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          副本
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        {{ object?.ContentType }}
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          对象锁
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        {{ object?.ContentType }}
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          配额
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        {{ object?.ContentType }}
      </n-descriptions-item>
      <n-descriptions-item label="标签">
        <span class="select-all">{{ object?.ETag }}</span>
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          版本控制
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        {{ object?.LastModified }}
      </n-descriptions-item>
    </n-descriptions>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const router = useRouter();
const { $s3Client } = useNuxtApp();
const message = useMessage();
const props = defineProps<{ bucket: string }>();

const bucketName = computed(() => props.bucket as string);

const bucketApi = useBucket({});

// 在服务端获取数据
const {
  data: object,
  status,
  refresh,
} = useAsyncData(`head-object&${bucketName.value}`, () => bucketApi.headObject(bucketName.value));
</script>
