<template>
 <n-drawer v-model:show="visibel" :width="502">
    <n-drawer-content :title="`桶配置(${bucketName})`" closable>
      <n-descriptions :column="1">
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
          副本
          <n-button class="align-middle" quaternary round type="primary">
            <Icon name="ri:edit-2-line" class="mr-2" />
          </n-button>
        </template>
        关闭
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
        </template>
         <n-switch
          :disabled="true"
          v-model:value="lockStatus"
          :loading="objectLockLoading"
          :round="false"
          @update:value="handleChangeVersionStatus" />
      </n-descriptions-item>

      <n-descriptions-item>
        <template #label>
          版本控制
        </template>
        <n-switch
          v-model:value="versioningStatus"
          :disabled="lockStatus== true"
          checked-value="Enabled"
          unchecked-value="Suspended"
          :round="false"
          :loading="statusLoading"
          @update:value="handleChangeVersionStatus" />
      </n-descriptions-item>
    </n-descriptions>
    </n-drawer-content>


      <!-- policy -->
    <n-modal v-model:show="showPolicyModal" title="设置策略" preset="card" draggable :style="{ width: '750px' }">
        <n-form ref="policyFormRef" :inline="policyFormValue.policy !=='custom'"  :label-width="80" :model="policyFormValue">
          <n-form-item label="策略" path="" class="flex-auto">
            <n-select v-model:value="policyFormValue.policy" placeholder="请选择策略" :options="policyOptions" />
          </n-form-item>
          <n-form-item :span="24" v-if="policyFormValue.policy =='custom'" label="策略原文" path="content">
            <n-scrollbar  class="w-full max-h-[60vh] "> <json-editor v-model="policyFormValue.content"  /></n-scrollbar>
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="submitPolicyForm">确认</n-button>
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
  </n-drawer>

</template>

<script setup lang="ts">
  const dialog = useDialog()
  const visibel = ref(false)
  const bucketName = ref('')
  const openDrawer = (bucket:string) => {
    visibel.value = true
    bucketName.value = bucket
    // 在服务端获取数据
    getData()

  }
  defineExpose({
  openDrawer
})

  const getData = ()=>{
    getbucketPolicy()
    getTags()
    getVersioningStatus()
    getObjectLockConfig()

  }

const message = useMessage()
const { getBucketTagging, deleteBucket, putBucketTagging, putBucketVersioning, getBucketVersioning , getBucketPolicy,
    putBucketPolicy,getObjectLockConfiguration,putObjectLockConfiguration} = useBucket({})

/**********object lock ***********************/
const lockStatus = ref(false)
const objectLockLoading = ref(false)
const getObjectLockConfig = async () => {
  objectLockLoading.value = true
  getObjectLockConfiguration( bucketName.value ).then(res=>{
    if(res.ObjectLockConfiguration?.ObjectLockEnabled){
      lockStatus.value = res.ObjectLockConfiguration?.ObjectLockEnabled == 'Enabled' ? true : false
    }else{
      lockStatus.value = false
    }
  }).finally(() => {
    objectLockLoading.value = false
  })
 
}

/**********object lock ***********************/


/******** policy ***********************/
import {setBucketPolicy,getBucketPolicy as getBucketPolicyFn} from '~/utils/bucketPolicy'

// const policys = setBucketPolicy([],'private',bucketName.value,'')
// console.log("🚀 ~ policys:", policys)
// const  po = getBucketPolicyFn(policys,bucketName.value,'')
// console.log(111,po)

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


const policyFormValue = ref({
  policy: "private",
  content:'{}'
})
const showPolicyModal = ref(false)
const editPolicy = () => {
  showPolicyModal.value = true
}

const submitPolicyForm = () => {
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
const tags = ref<Tag[]>([])
const getTags = async()=>{
  const resp: any = await getBucketTagging(bucketName.value)
  tags.value = resp.TagSet || []
}


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

</script>

<style lang="scss" scoped>
</style>