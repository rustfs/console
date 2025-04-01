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

        <!-- <n-button>
          <Icon name="ri:key-2-line" class="mr-2" />
          <span>访问权限</span>
        </n-button> -->

        <n-button>
          <Icon name=" ri:surgical-mask-line" class="mr-2" />
          <span>匿名访问</span>
        </n-button>

        <n-popconfirm @positive-click="handleDelteBucket">
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
      <!-- <n-descriptions-item class="font-bold">
        <template #label>
          当前状态
          <n-button class="align-middle" quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        {{ 111 }}
      </n-descriptions-item> -->
      <n-descriptions-item>
        <template #label>
          访问策略
          <n-button class="align-middle" quaternary round type="primary" @click="editPolicy">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        {{ policyOptions.find(item => item.value === bucketPolicy)?.label }}
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          加密类型
          <n-button class="align-middle" quaternary round type="primary" @click="editEncript">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        禁用
      </n-descriptions-item>
      <!-- <n-descriptions-item>
        <template #label>
          使用情况报告
          <n-button class="align-middle" quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        todo
      </n-descriptions-item> -->
      <n-descriptions-item>
        <template #label>
          副本
          <n-button class="align-middle" quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        关闭
      </n-descriptions-item>
      
      <!-- <n-descriptions-item>
        <template #label>
          配额
          <n-button class="align-middle" quaternary round type="primary">
            <Icon name="ri:edit-2-line" />
          </n-button>
        </template>
        todo
      </n-descriptions-item> -->
      <n-descriptions-item class="w-1/2">
        <template #label>
          标签
          <n-button class="align-middle" round quaternary type="primary" @click="addTag">
            <Icon name="ri:add-line" size="16" class="mr-2" />
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
          对象锁
          <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        关闭
      </n-descriptions-item>

      <n-descriptions-item>
        <template #label>
          版本控制
          <!-- <n-button quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button> -->
        </template>
        <n-switch
          v-model:value="versioningStatus"
          checked-value="Enabled"
          unchecked-value="Suspended"
          :loading="statusLoading"
          @update:value="handleChangeVersionStatus" />
      </n-descriptions-item>
    </n-descriptions>
  </n-card>

  <!-- policy -->
<n-modal v-model:show="showPolicyModal" title="设置策略" preset="card" draggable :style="{ width: '750px' }">
    <n-form ref="policyFormRef" :inline="policyFormValue.policy !=='custom'"  :label-width="80" :model="policyFormValue">
       <n-form-item label="策略" path="" class="flex-auto">
        <n-select v-model:value="policyFormValue.policy" placeholder="请选择策略" :options="policyOptions" />
      </n-form-item>
      <n-form-item :span="24" v-if="policyFormValue.policy =='custom'" label="策略原文" path="content">
        <json-editor v-model="policyFormValue.content" class=" overflow-y-auto" />
      </n-form-item>
      <n-form-item>
        <n-button type="primary" @click="submitTagForm">确认</n-button>
        <n-button class="mx-4" @click="showPolicyModal = false">取消</n-button>
      </n-form-item>
    </n-form>
  </n-modal>

  <!-- tag -->
  <n-modal v-model:show="showTagModal" title="设置tag" preset="card" draggable :style="{ width: '550px' }">
    <n-form ref="formRef" inline :label-width="80" :model="tagFormValue">
      <n-form-item label="标签key" path="name">
        <n-input v-model:value="tagFormValue.name" placeholder="输入标签key" />
      </n-form-item>
      <n-form-item label="标签值" path="value">
        <n-input v-model:value="tagFormValue.value" placeholder="输入标签值" />
      </n-form-item>
      <n-form-item>
        <n-button type="primary" @click="submitTagForm">确认</n-button>
        <n-button class="mx-4" @click="showTagModal = false">取消</n-button>
      </n-form-item>
    </n-form>
  </n-modal>

  <!-- Encrypt -->
  <n-modal v-model:show="showEncryptModal" title="启用存储空间加密" preset="card" draggable :style="{ width: '550px' }">
    <n-form ref="encryptFormRef" label-placemen="left" label-width="auto" inline :model="encryptFormValue">
      <n-form-item label="加密类型" path="encrypt" class="flex-auto">
        <n-select v-model:value="encryptFormValue.encrypt" placeholder="请选择加密类型" :options="encryptOptions" />
      </n-form-item>
      <n-form-item v-if="encryptFormValue.encrypt == 'SSE-KMS'" label="KMS Key ID" path="kmsKeyId" class="flex-auto">
        <n-select v-model:value="encryptFormValue.kmsKeyId" placeholder="" :options="[]" />
      </n-form-item>

      <n-form-item>
        <n-button type="primary" @click="submitEncryptForm">确认</n-button>
        <n-button class="mx-4" @click="showEncryptModal = false">取消</n-button>
      </n-form-item>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from "vue"

const router = useRouter()
const message = useMessage()
const props = defineProps<{ bucket: string }>()

const bucketName = computed(() => props.bucket as string)

const { headBucket, getBucketTagging, deleteBucket, putBucketTagging, putBucketVersioning, getBucketVersioning , getBucketPolicy,
    putBucketPolicy,} = useBucket({})

/******** policy ***********************/
import {setPolicy,getPolicy,getPolicies} from '~/utils/bucketPolicy'

const policys = setPolicy([],'readonly',bucketName.value,'')
console.log("🚀 ~ policys:", policys)
const  po = getPolicy(policys,bucketName.value,'')
console.log(111,po)

const bucketPolicy = ref("private")
const getbucketPolicy = async () => {
  try {
    const res = await getBucketPolicy( bucketName.value )
    console.log("🚀 ~ getbucketPolicy ~ res:", res)
    // bucketPolicy.value = res.Policy
  } catch (error) {
    // console.error("Error fetching bucket policy:", error)
  }
}
getbucketPolicy()

const policyFormValue = ref({
  policy: "private",
  content:'{}'
})
const showPolicyModal = ref(false)
const editPolicy = () => {
  showPolicyModal.value = true
}
const policyOptions = [
  {
    label: "公有",
    value: "public",
  },
  {
    label: "私有",
    value: "private",
  },
  {
    label: "自定义",
    value: "custom",
  },
]


/******** policy ***********************/



/********Encrypt ***********************/
const showEncryptModal = ref(false)
const encryptFormValue = ref({
  encrypt: "disabled",
  kmsKeyId: "",
})

const encryptOptions = [
  {
    label: "禁用",
    value: "disabled",
  },
  {
    label: "SSE-KMS",
    value: "SSE-KMS",
  },
  {
    label: "SSE-S3",
    value: "SSE-S3",
  },
]

const editEncript = () => {
  showEncryptModal.value = true
}
const submitEncryptForm = () => {
  // 处理表单提交逻辑
  // console.log("提交表单数据:", encryptFormValue.value)
  // showEncryptModal.value = false
  if (encryptFormValue.value.encrypt == "SSE-KMS") {
    message.error("您提供的 XML 格式不正确，或者未根据我们发布的架构进行验证。 (MasterKeyID 未找到 aws:kms)。")
  } else if (encryptFormValue.value.encrypt == "SSE-S3") {
    message.error("指定了服务器端加密，但S3未配置。")
  } else {
    message.success("修改成功")
    showEncryptModal.value = false
  }
}

/********Encrypt ***********************/

/********versioning ***********************/
const versioningStatus: any = ref("")
const versionStatus = ref("Suspended")
const statusLoading = ref(false)
// 获取版本控制状态
const getVersioningStatus = async () => {
  try {
    const resp = await getBucketVersioning(bucketName.value)
    versioningStatus.value = resp.Status
  } catch (error) {
    console.error("获取版本控制状态失败:", error)
  }
}
getVersioningStatus()

const handleChangeVersionStatus = async (value: string) => {
  statusLoading.value = true
  putBucketVersioning(bucketName.value, value)
    .then(() => {
      message.success("修改成功")
      getVersioningStatus()
    })
    .finally(() => {
      statusLoading.value = false
      versioningStatus.value = versioningStatus.value == "Suspended" ? "Enabled" : "Suspended"
    })
}

/********versioning ***********************/

/********tag ***********************/
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
const dialog = useDialog()
const handledeleteTag = (index: number) => {
   dialog.error({
    title: "警告",
    content: "你确定要删除这个标签吗？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
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
      },
  });
}
/********tag ***********************/

// 在服务端获取数据
const {
  data: bucket,
  status,
  refresh,
} = useAsyncData(`head-bucket&${bucketName.value}`, () => headBucket(bucketName.value))

const  handleDelteBucket = ()=>{
  deleteBucket(bucketName.value).then(()=>{
    message.success("删除成功")
    router.push("/browser")
  }).catch((error)=>{
    message.error("删除失败")
  })
}
</script>
