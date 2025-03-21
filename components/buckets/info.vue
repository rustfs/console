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
        todo
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          使用情况报告
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        todo
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          副本
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        todo
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          对象锁
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        todo
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          配额
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        todo
      </n-descriptions-item>
      <n-descriptions-item class="w-1/2">
        <template #label>
          标签
          <n-button quaternary round type="primary" @click="addTag">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        <n-tag
          class="m-2"
          v-for="(tag, index) in tags"
          type="info"
          @click="editTag(index)"
          closable
          @close="handledeleteTag(index)">
          {{ tag.Key }}:{{ tag.Value }}
        </n-tag>
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          版本控制
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        todo
      </n-descriptions-item>
    </n-descriptions>
  </n-card>
  <!-- tag -->
  <n-modal v-model:show="showTagModal" title="设置tag" preset="card" draggable :style="{ width: '550px' }">
    <n-form ref="formRef" inline :label-width="80" :model="tagFormValue">
      <n-form-item label="标签key" path="user.name">
        <n-input v-model:value="tagFormValue.name" placeholder="输入标签key" />
      </n-form-item>
      <n-form-item label="标签值" path="phone">
        <n-input v-model:value="tagFormValue.value" placeholder="输入标签值" />
      </n-form-item>
      <n-form-item>
        <n-button type="primary" @click="submitTagForm">确认</n-button>
        <n-button class="mx-4" @click="showTagModal = false">取消</n-button>
      </n-form-item>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from "vue"

const router = useRouter()
const { $s3Client } = useNuxtApp()
const message = useMessage()
const props = defineProps<{ bucket: string }>()

const bucketName = computed(() => props.bucket as string)

const { headBucket, getBucketTagging, putBucketTagging, deleteBucketTagging } = useBucket({})

/********tag */
// 定义标签的类型
interface Tag {
  Key: string
  Value: string
}
const showTagModal = ref(false)

const tagFormValue = ref({
  name: "",
  value: "",
})
// 获取标签
const resp: any = await getBucketTagging(bucketName.value)
const tags = ref<Tag[]>(resp.TagSet || [])

const addTag = () => {
  nowTagIndex.value = -1
  tagFormValue.value = { name: "", value: "" } // 清空表单
  showTagModal.value = true
}

const submitTagForm = () => {
  if (!tagFormValue.value.name || !tagFormValue.value.value) {
    message.error("请填写完整的标签信息")
    return
  }

  if (nowTagIndex.value === -1) {
    tags.value.push({ Key: tagFormValue.value.name, Value: tagFormValue.value.value })
  }
  if (nowTagIndex.value !== -1) {
    tags.value[nowTagIndex.value] = { Key: tagFormValue.value.name, Value: tagFormValue.value.value }
  }
  // 调用 putBucketTagging 接口
  putBucketTagging(bucketName.value, { TagSet: tags.value })
    .then(() => {
      showTagModal.value = false // 关闭模态框
      message.success("标签更新成功")
    })
    .catch((error) => {
      message.error("标签更新失败: " + error.message)
    })
}

const nowTagIndex = ref(-1)
// 编辑标签
const editTag = (index: number) => {
  nowTagIndex.value = index
  const nowTag = tags.value[index]
  tagFormValue.value = { name: nowTag.Key, value: nowTag.Value } // 填充表单
  showTagModal.value = true // 打开模态框
}
const handledeleteTag = (index: number) => {
  nowTagIndex.value = index
  tags.value.splice(index, 1) // 从标签列表中删除

  // 调用 putBucketTagging 接口
  putBucketTagging(bucketName.value, { TagSet: tags.value })
    .then(() => {
      message.success("标签更新成功")
    })
    .catch((error) => {
      message.error("删除标签失败: " + error.message)
    })
}
/********tag */

// 在服务端获取数据
const {
  data: bucket,
  status,
  refresh,
} = useAsyncData(`head-bucket&${bucketName.value}`, () => headBucket(bucketName.value))
</script>
