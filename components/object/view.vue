<template>
  <n-page-header @back="router.back()">
    <template #title>
      {{ t('Object Details') }}
    </template>
    <template #extra>
      <div class="flex items-center gap-4 ml-auto">
        <n-button @click="() => download()">
          <Icon name="ri:download-line" class="mr-2" />
          <span>{{ t('Download') }}</span>
        </n-button>

        <n-button @click="() => copySignedUrl()">
          <Icon name="ri:file-copy-line" class="mr-2" />
          <span>{{ t('Copy URL') }}</span>
        </n-button>

        <n-button @click="() => (showPreview = true)">
          <Icon name="ri:eye-line" class="mr-2" />
          <span>{{ t('Preview') }}</span>
        </n-button>

        <n-button @click="() => (showTagView = true)">
          <Icon name="ri:price-tag-3-line" class="mr-2" />
          <span>{{ t('Tags') }}</span>
        </n-button>

        <n-popconfirm @positive-click="deleteObject">
          <template #trigger>
            <n-button ghost type="error">
              <Icon name="ri:delete-bin-7-line" class="mr-2" />
              <span>{{ t('Delete') }}</span>
            </n-button>
          </template>
          {{ t('Delete Confirm', { key }) }}
        </n-popconfirm>

        <n-button @click="() => refresh()">
          <Icon name="ri:refresh-line" class="mr-2" />
          <span>{{ t('Refresh') }}</span>
        </n-button>
      </div>
    </template>
  </n-page-header>
  <n-card :title="t('Info')">
    <div v-if="status === 'pending'" class="flex items-center justify-center">
      <n-spin size="small" />
    </div>
    <n-descriptions :column="1">
      <n-descriptions-item :label="t('Object Name')"
        ><span class="select-all">{{ key }}</span></n-descriptions-item
      >
      <n-descriptions-item :label="t('Object Size')">{{
        object?.ContentLength
      }}</n-descriptions-item>
      <n-descriptions-item :label="t('Object Type')">{{ object?.ContentType }}</n-descriptions-item>
      <!-- <n-descriptions-item label="存储类型">{{ object?.StorageClass }}</n-descriptions-item> -->
      <n-descriptions-item label="ETag"
        ><span class="select-all">{{ object?.ETag }}</span></n-descriptions-item
      >
      <n-descriptions-item :label="t('Last Modified Time')">{{
        object?.LastModified
      }}</n-descriptions-item>
    </n-descriptions>

    <object-preview-modal v-model:show="showPreview" :bucketName="bucketName" :objectKey="key" />

    <!-- tagview -->
    <n-modal
      v-model:show="showTagView"
      preset="card"
      :title="t('Set Tags')"
      draggable
      class="max-w-screen-md"
    >
      <n-card class="max-w-screen-md">
        <n-space class="my-4">
          <n-tag
            class="m-2 align-middle"
            v-for="(tag, index) in tags"
            type="info"
            closable
            @close="handledeleteTag(index)"
          >
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
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const router = useRouter();
const { $s3Client } = useNuxtApp();
const message = useMessage();
const props = defineProps<{ bucket: string; objectKey: string }>();

const bucketName = computed(() => props.bucket as string);
const { getObjectTagging, putObjectTagging, deleteObjectTagging } = useObject({
  bucket: bucketName.value,
});

// 当前路径的前缀, example: '/folder1/folder2/'
const key = computed(() => decodeURIComponent(props.objectKey as string));

// 预览内容
const showPreview = ref(false);
//  标签
const showTagView = ref(false);
const tagFormValue = ref({
  Key: '',
  Value: '',
});
interface Tag {
  Key: string;
  Value: string;
}
// 获取tags
const tags = ref<Tag[]>([]);
const getTags = async () => {
  const resp: any = await getObjectTagging(key.value);
  tags.value = resp.TagSet || [];
};
getTags();

const dialog = useDialog();
// 删除标签
const handledeleteTag = async (index: number) => {
  dialog.error({
    title: t('Warning'),
    content: t('Delete Tag Confirm'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      putObjectTagging(key.value, {
        TagSet: tags.value.filter((item, keyIndex) => keyIndex !== index),
      })
        .then(() => {
          message.success(t('Tag Update Success'));
          getTags();
        })
        .catch(error => {
          message.error(t('Tag Delete Failed', { error: error.message }));
        });
    },
  });
};

const submitTagForm = async () => {
  const tag = {
    Key: tagFormValue.value.Key,
    Value: tagFormValue.value.Value,
  };
  putObjectTagging(key.value, {
    TagSet: [...tags.value, tag],
  }).then(() => {
    message.success(t('Tag Set Success'));
    getTags();
  });
};

const objectApi = useObject({ bucket: bucketName.value });

// 在服务端获取数据
const {
  data: object,
  status,
  refresh,
} = useAsyncData(`head-object&${key}`, () => objectApi.headObject(key.value));

const download = async () => {
  const msg = message.loading(t('Getting URL'));
  const url = await objectApi.getSignedUrl(key.value);
  msg.destroy();
  window.open(url, '_blank');
};

const copySignedUrl = async () => {
  const msg = message.loading(t('Getting URL'));
  const url = await objectApi.getSignedUrl(key.value);
  await navigator.clipboard.writeText(url);
  msg.destroy();
  message.success(t('URL Copied'));
};
const deleteObject = async () => {
  await objectApi.deleteObject(key.value);
  message.success(t('Delete Success'));
  router.back();
};
</script>
