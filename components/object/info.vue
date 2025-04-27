<template>
  <n-drawer v-model:show="visibel" :width="550">
    <n-drawer-content :title="t('Object Details')">
      <div class="flex items-center gap-4 ml-auto">
        <n-button @click="download">
          <Icon name="ri:download-line" class="mr-2" />
          <span>{{ t('Download') }}</span>
        </n-button>

        <n-button @click="() => showPreview = true">
          <Icon name="ri:eye-line" class="mr-2" />
          <span>{{ t('Preview') }}</span>
        </n-button>

        <n-button @click="() => showTagView = true">
          <Icon name="ri:price-tag-3-line" class="mr-2" />
          <span>{{ t('Tags') }}</span>
        </n-button>

        <n-button id="copyTag" ref="copyRef" @click="copySignUrl">
          <Icon name="ri:file-copy-line" class="mr-2" />
          <span>{{ t('Copy URL') }}</span>
        </n-button>

      </div>
      <n-card :title="t('Info')" class="mt-4">
        <div v-if="loading === 'pending'" class="flex items-center justify-center">
          <n-spin size="small" />
        </div>
        <n-descriptions :column="1">
          <n-descriptions-item :label="t('Object Name')"><span class="select-all">{{ key }}</span></n-descriptions-item>
          <n-descriptions-item :label="t('Object Size')">{{ object?.ContentLength }}</n-descriptions-item>
          <n-descriptions-item :label="t('Object Type')">{{ object?.ContentType }}</n-descriptions-item>
          <!-- <n-descriptions-item label="存储类型">{{ object?.StorageClass }}</n-descriptions-item> -->
          <n-descriptions-item label="ETag"><span class="select-all">{{ object?.ETag }}</span></n-descriptions-item>
          <n-descriptions-item :label="t('Last Modified Time')">{{ object?.LastModified }}</n-descriptions-item>
          <!-- <n-descriptions-item label="版本ID">{{ object?.VersionId }}</n-descriptions-item>
          <n-descriptions-item label="存储类型">{{ object?.StorageClass }}</n-descriptions-item> -->
          <n-descriptions-item :label="t('Temporary URL')">
            <div class="flex items-center gap-2 mt-1">
              <n-input v-model:value="signedUrl" id="signedUrl" :placeholder="t('Temporary URL')" />
              <n-button @click="copySignUrl">{{ t('Copy') }}</n-button>
            </div>
          </n-descriptions-item>
        </n-descriptions>

        <object-preview-modal v-model:show="showPreview" :bucketName="bucketName" :objectKey="key" />

        <!-- tagview -->
        <n-modal v-model:show="showTagView" preset="card" :title="t('Set Tags')" draggable class="max-w-screen-md">
          <n-card class="max-w-screen-md">
            <n-space class="my-4">
              <n-tag class="m-2 align-middle" v-for="(tag, index) in tags" type="info" closable @close="handledeleteTag(index)">
                {{ tag.Key }}:{{ tag.Value }}
              </n-tag>
            </n-space>
            <n-form ref="formRef" inline class="flex" :label-width="80" :model="tagFormValue">
              <n-form-item :label="t('Tag Key')" path="Key">
                <n-input v-model:value="tagFormValue.Key" :placeholder="t('Tag Key Placeholder')" />
              </n-form-item>
              <n-form-item :label="t('Tag Value')" path="Value">
                <n-input v-model:value="tagFormValue.Value" :placeholder="t('Tag Value Placeholder')" />
              </n-form-item>
              <n-form-item>
                <n-button type="primary" @click="submitTagForm">{{ t('Add') }}</n-button>
                <n-button class="mx-4" @click="showTagView = false">{{ t('Cancel') }}</n-button>
              </n-form-item>
            </n-form>
          </n-card>

        </n-modal>
      </n-card>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n();
const visibel = ref(false)
const bucketName = ref('')
const key = ref('')

let objectApi: any
const openDrawer = (bucket: string, objName: string) => {
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
const getTags = async () => {
  const { getObjectTagging } = useObject({ bucket: bucketName.value })

  const resp: any = await getObjectTagging(key.value)
  tags.value = resp.TagSet || []

}

// 删除标签
const handledeleteTag = async (index: number) => {
  const { putObjectTagging } = useObject({ bucket: bucketName.value })
  dialog.error({
    title: t("Warning"),
    content: t("Delete Tag Confirm"),
    positiveText: t("Confirm"),
    negativeText: t("Cancel"),
    onPositiveClick: async () => {
      putObjectTagging(key.value, { TagSet: tags.value.filter((item, keyIndex) => keyIndex !== index) })
        .then(() => {
          message.success(t("Tag Update Success"))
          getTags()
        })
        .catch((error) => {
          message.error(t("Tag Delete Failed", { error: error.message }))
        })
    },
  });


}

const submitTagForm = async () => {
  const { putObjectTagging } = useObject({ bucket: bucketName.value })
  const tag = {
    Key: tagFormValue.value.Key,
    Value: tagFormValue.value.Value
  }
  putObjectTagging(key.value, {
    TagSet: [...tags.value, tag]
  }).then(() => {
    message.success(t('Tag Set Success'))
    getTags()
  })
}

const object = ref()
const loading = ref('pending')
const signedUrl = ref('')

const getObject = () => {
  objectApi.headObject(key.value).then(async (res: any) => {
    object.value = res
    loading.value = 'fulfilled'
    signedUrl.value = await objectApi.getSignedUrl(key.value);
  })
}

const refreshSignedUrl = async () => {
  try {
    signedUrl.value = await objectApi.getSignedUrl(key.value);
    message.success(t('Get Success'));
  } catch (error) {
    message.error(t('Get Failed'));
  } finally {
  }
}

import ClipboardJS from 'clipboard'
const dialog = useDialog()
const copySignUrl = async () => {
  try {
    // @ts-ignore
    ClipboardJS.copy(document.querySelector('#signedUrl'))
    console.log('复制成功', signedUrl.value);
  } catch (error) {
    message.error(t('Copy Failed'))
    console.error('复制失败', error)
  }
}

const download = async () => {
  const msg = message.loading(t('Getting URL'));
  await refreshSignedUrl()
  const url = await objectApi.getSignedUrl(key.value);
  msg.destroy();
  window.open(url, '_blank')
}
</script>
