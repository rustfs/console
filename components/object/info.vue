<template>
 <n-drawer v-model:show="visibel"  :width="450">
    <n-drawer-content title="对象信息">
      <div class="flex items-center gap-4 ml-auto">
        <n-button @click="download">
          <Icon name="ri:download-line" class="mr-2" />
          <span>下载</span>
        </n-button>
       
        <n-button @click="() => showPreview = true">
          <Icon name="ri:eye-line" class="mr-2" />
          <span>预览</span>
        </n-button>

        <n-button @click="() => showTagView = true">
          <Icon name="ri:price-tag-3-line" class="mr-2" />
          <span>标签</span>
        </n-button>

         <n-button id="copyTag" ref="copyRef"  @click="copySignedUrl">
          <Icon name="ri:file-copy-line" class="mr-2" />
          <span>复制临时链接</span>
        </n-button>

      </div>
      <n-card title="对象信息" class="mt-4">
    <div v-if="loading === 'pending'" class="flex items-center justify-center">
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

    <!-- tagview -->
    <n-modal v-model:show="showTagView"  preset="card" title="设置tag"  draggable class="max-w-screen-md">
      <n-card class="max-w-screen-md">
        <n-space class="my-4">
            <n-tag
          class="m-2 align-middle"
          v-for="(tag, index) in tags"
          type="info"
          closable
          @close="handledeleteTag(index)">
          {{ tag.Key }}:{{ tag.Value }}
        </n-tag>
        </n-space>
        <n-form ref="formRef" inline class="flex" :label-width="80" :model="tagFormValue">
          <n-form-item label="标签key" path="Key">
            <n-input v-model:value="tagFormValue.Key" placeholder="输入标签key" />
          </n-form-item>
          <n-form-item label="标签值" path="Value">
            <n-input v-model:value="tagFormValue.Value" placeholder="输入标签值" />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="submitTagForm">添加</n-button>
            <n-button class="mx-4" @click="showTagView = false">取消</n-button>
          </n-form-item>
        </n-form>
      </n-card>

  </n-modal>
  </n-card>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
 const dialog = useDialog()
  const visibel = ref(false)
  const bucketName = ref('')
  const key = ref('')
  let objectApi: any
  const openDrawer = (bucket:string,objName:string) => {
    visibel.value = true
    bucketName.value = bucket
    key.value = objName
    objectApi = useObject({ bucket: bucketName.value });
    getTags()
    getObject()
  }
  defineExpose({
  openDrawer
})


const router = useRouter()
const message = useMessage();


// 当前路径的前缀, example: '/folder1/folder2/'
// 预览内容
const showPreview = ref(false)
//  标签
const showTagView = ref(false)
const tagFormValue = ref({
  Key: '',
  Value: ''
})
interface Tag {
  Key: string
  Value: string
}
// 获取tags
const tags = ref<Tag[]>([])
const getTags = async()=>{
    const {getObjectTagging} = useObject({bucket:bucketName.value})

  const resp: any = await getObjectTagging(key.value)
  tags.value = resp.TagSet || []

}

// 删除标签
const handledeleteTag = async (index: number) => {
   const { putObjectTagging} = useObject({bucket:bucketName.value})
   dialog.error({
    title: "警告",
    content: "你确定要删除这个标签吗？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      putObjectTagging(key.value, { TagSet: tags.value.filter((item,keyIndex)=> keyIndex!==index) })
      .then(() => {
        message.success("标签更新成功")
        getTags()
      })
      .catch((error) => {
        message.error("删除标签失败: " + error.message)
      })
      },
  });
 
 
}

const submitTagForm = async () => {
  const { putObjectTagging} = useObject({bucket:bucketName.value})
  const tag = {
    Key: tagFormValue.value.Key,
    Value: tagFormValue.value.Value
  }
   putObjectTagging( key.value, {
    TagSet: [...tags.value,tag]
  }).then(() => {
     message.success('标签设置成功')
     getTags()
  })
 
}


const object = ref()
const loading = ref('pending')
const getObject =  () => {
  objectApi.headObject(key.value).then((res:any)=>{
    object.value = res
    loading.value = 'fulfilled'
  })
}

const download = async () => {
  const msg = message.loading('正在获取下载链接...');
  const url = await objectApi.getSignedUrl(key.value);
  msg.destroy();
  window.open(url, '_blank')
}

const copySignedUrl = async () => {
  const msg = message.loading('正在获取下载链接...');
  let value = await objectApi.getSignedUrl(key.value)
 if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value).then(() => {
      message.success('链接已复制到剪贴板');
    }).catch(err => {
      message.error(`复制失败：${err}`);
    });
  } else {
    let textarea = document.createElement('textarea');
    textarea.value = value;
    console.log(1)
    document.body.appendChild(textarea);
    textarea.focus({preventScroll:true});
    textarea.select();
    try {
      let s = document.execCommand('copy');
       console.log("🚀 ~ copySignedUrl ~ s:", s)
       message.success('链接已复制到剪贴板');
    } catch (err) {
      message.error(`复制失败：${err}`);
    }
    document.body.removeChild(textarea);
  }
  msg.destroy();
}
</script>

<style lang="scss" scoped>


</style>