<template>
  <n-drawer v-model:show="visibel" :width="550">
    <n-drawer-content :title="t('Object Details')">
      <div class="flex items-center flex-wrap gap-4 ml-auto">
        <n-button @click="download">
          <Icon name="ri:download-line" class="mr-2" />
          <span>{{ t('Download') }}</span>
        </n-button>

        <n-button @click="() => (showPreview = true)">
          <Icon name="ri:eye-line" class="mr-2" />
          <span>{{ t('Preview') }}</span>
        </n-button>

        <n-button @click="() => (showTagView = true)">
          <Icon name="ri:price-tag-3-line" class="mr-2" />
          <span>{{ t('Tags') }}</span>
        </n-button>

        <n-button @click="geVersions">
          <Icon name="ri:file-history-line" class="mr-2" />
          <span>{{ t('Version') }}</span>
        </n-button>

        <n-button v-if="lockStatus" @click="() => (showRetentionView = true)">
          <Icon name="ri:save-2-line" class="mr-2" />
          <span>{{ t('Retention') }}</span>
        </n-button>

        <!-- <n-button id="copyTag" ref="copyRef" @click="copySignUrl">
          <Icon name="ri:file-copy-line" class="mr-2" />
          <span>{{ t("Copy URL") }}</span>
        </n-button> -->
      </div>
      <n-card :title="t('Info')" class="mt-4">
        <div v-if="loading === 'pending'" class="flex items-center justify-center">
          <n-spin size="small" />
        </div>
        <n-descriptions :column="1">
          <n-descriptions-item :label="t('Object Name')">
            <span class="select-all">{{ key }}</span>
          </n-descriptions-item>
          <n-descriptions-item :label="t('Object Size')">{{
            object?.ContentLength
          }}</n-descriptions-item>
          <n-descriptions-item :label="t('Object Type')">{{
            object?.ContentType
          }}</n-descriptions-item>
          <!-- <n-descriptions-item label="存储类型">{{ object?.StorageClass }}</n-descriptions-item> -->
          <n-descriptions-item label="ETag">
            <span class="select-all">{{ object?.ETag }}</span>
          </n-descriptions-item>
          <n-descriptions-item :label="t('Last Modified Time')">{{
            object?.LastModified
          }}</n-descriptions-item>

          <!-- 合法保留 -->
          <n-descriptions-item :label="t('Legal Hold')">
            <n-switch
              class="mt-1"
              v-if="lockStatus"
              v-model:value="legalHold"
              :loading="legalHoldLoading"
              :round="false"
              @update:value="handleChangeLegalStatus"
            >
              <template #checked>
                {{ t('Enabled') }}
              </template>
              <template #unchecked>
                {{ t('Disabled') }}
              </template>
            </n-switch>
            <n-tag type="error" size="small" v-else class="mt-2">
              {{ t('Disabled') }}
              <template #icon>
                <Icon name="ri:close-circle-fill" />
              </template>
            </n-tag>
          </n-descriptions-item>

          <!-- 保留 -->
          <n-descriptions-item :label="t('Retention') + t('Policy')">
            <n-space>
              <span>{{
                t('Retention Mode') + ': ' + (retentionMode ? retentionMode : t('None'))
              }}</span>
            </n-space>
            <n-space v-if="retainUntilDate">
              <span>{{ t('Retention RetainUntilDate') + ': ' + retainUntilDate }}</span>
            </n-space>
          </n-descriptions-item>

          <!-- <n-descriptions-item label="版本ID">{{ object?.VersionId }}</n-descriptions-item>
          <n-descriptions-item label="存储类型">{{ object?.StorageClass }}</n-descriptions-item> -->
          <n-descriptions-item :label="t('Temporary URL')">
            <div class="flex items-center gap-2 mt-1">
              <n-input v-model:value="signedUrl" id="signedUrl" :placeholder="t('Temporary URL')" />
              <n-button id="signedUrlBtn" data-clipboard-target="#signedUrl">{{
                t('Copy')
              }}</n-button>
            </div>
          </n-descriptions-item>
        </n-descriptions>

        <object-preview-modal
          v-model:show="showPreview"
          :bucketName="bucketName"
          :objectKey="key"
          :versionId="previewVersionId"
        />

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
                <n-input
                  v-model:value="tagFormValue.Value"
                  :placeholder="t('Tag Value Placeholder')"
                />
              </n-form-item>
              <n-form-item>
                <n-button type="primary" @click="submitTagForm">{{ t('Add') }}</n-button>
                <n-button class="mx-4" @click="showTagView = false">{{ t('Cancel') }}</n-button>
              </n-form-item>
            </n-form>
          </n-card>
        </n-modal>

        <n-modal
          v-model:show="showRetentionView"
          preset="card"
          :title="t('Retention') + t('Policy')"
          class="max-w-screen-md"
        >
          <n-card class="flex-col justify-center items-center">
            <n-form
              ref="retentionFormRef"
              :label-width="200"
              label-placement="left"
              label-align="left"
              class="w-[500px]"
            >
              <n-form-item :label="t('Retention Mode')" path="retentionMode" class="flex-auto">
                <n-radio-group v-model:value="retentionMode">
                  <n-radio value="COMPLIANCE">{{ t('COMPLIANCE') }}</n-radio>
                  <n-radio value="GOVERNANCE">{{ t('GOVERNANCE') }}</n-radio>
                </n-radio-group>
              </n-form-item>

              <n-form-item
                :label="t('Retention RetainUntilDate')"
                path="retainUntilDate"
                class="flex-auto"
              >
                <n-date-picker
                  v-model:formatted-value="retainUntilDate"
                  value-format="yyyy-MM-dd HH:mm:ss"
                  type="datetime"
                  clearable
                />
              </n-form-item>

              <n-form-item>
                <n-button type="primary" @click="submitRetention">{{ t('Confirm') }}</n-button>
                <n-button class="mx-4" @click="resetRetention">{{ t('Reset') }}</n-button>
                <n-button @click="showRetentionView = false">{{ t('Cancel') }}</n-button>
              </n-form-item>
            </n-form>
          </n-card>
        </n-modal>
      </n-card>
    </n-drawer-content>
  </n-drawer>
  <VersionsModal
    :bucketName="bucketName"
    :objectKey="key"
    :visible="showVersions"
    @close="showVersions = false"
    @preview="handlePreviewVersion"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import VersionsModal from './versions.vue';

const { t } = useI18n();
const visibel = ref(false);
const bucketName = ref('');
const key = ref('');

let objectApi: any;
const openDrawer = (bucket: string, objName: string) => {
  visibel.value = true;
  bucketName.value = bucket;
  key.value = objName;
  objectApi = useObject({ bucket: bucketName.value });
  getTags();
  getObject();
  getObjectLockConfig();
};
defineExpose({
  openDrawer,
});

const message = useMessage();

// 当前路径的前缀, example: '/folder1/folder2/'
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
  const { getObjectTagging } = useObject({ bucket: bucketName.value });

  const resp: any = await getObjectTagging(key.value);
  tags.value = resp.TagSet || [];
};

/****************************************************************** */
// 获取object lock  保留与合法保留相关
/****************************************************************** */
// const { getObjectRetention, putObjectRetention, getObjectLegalHold, putObjectLegalHold } = useObject({
//   bucket: bucketName.value,
// });

// 桶的object lock状态
const lockStatus = ref(false);
// 合法保留状态
const legalHold = ref(false);
const legalHoldLoading = ref(false);

// 获取桶的object lock
const getObjectLockConfig = async () => {
  const { getObjectLockConfiguration } = useBucket({});
  getObjectLockConfiguration(bucketName.value).then(res => {
    if (res.ObjectLockConfiguration?.ObjectLockEnabled) {
      lockStatus.value = res.ObjectLockConfiguration?.ObjectLockEnabled == 'Enabled' ? true : false;
      // 如果桶开启了object lock，则获取合法保留状态
      if (lockStatus.value) {
        getObjectLegalHoldFn();
        getObjectRetentionFn();
      }
    } else {
      lockStatus.value = false;
    }
  });
};

// 获取合法保留状态
const getObjectLegalHoldFn = () => {
  legalHoldLoading.value = true;
  const { getObjectLegalHold } = useObject({
    bucket: bucketName.value,
  });
  getObjectLegalHold(key.value)
    .then(res => {
      legalHold.value = res.LegalHold?.Status == 'ON' ? true : false;
    })
    .finally(() => {
      legalHoldLoading.value = false;
    });
};

const handleChangeLegalStatus = () => {
  const { putObjectLegalHold } = useObject({
    bucket: bucketName.value,
  });
  putObjectLegalHold(key.value, {
    Status: legalHold.value ? 'ON' : 'OFF',
  }).finally(() => {
    getObjectLegalHoldFn();
  });
};

/**======================================================= */
// 保留相关
const retentionFormRef = ref();

const retentionMode = ref<string | null>(null);
const retainUntilDate = ref<string | null>(null);

const retentionLoading = ref(false);
const showRetentionView = ref(false);
// 获取保留状态
const getObjectRetentionFn = () => {
  const { getObjectRetention } = useObject({
    bucket: bucketName.value,
  });
  getObjectRetention(key.value).then(res => {
    if (res.Retention) {
      retentionMode.value = res.Retention.Mode || '';
      retainUntilDate.value = res.Retention.RetainUntilDate
        ? dayjs(res.Retention.RetainUntilDate).format('YYYY-MM-DD HH:mm:ss')
        : null;
    } else {
      retentionMode.value = '';
    }
  });
};

const submitRetention = () => {
  retentionLoading.value = true;

  const { putObjectRetention } = useObject({
    bucket: bucketName.value,
  });
  putObjectRetention(key.value, {
    Mode: retentionMode.value,
    RetainUntilDate: retainUntilDate.value ? new Date(retainUntilDate.value) : null,
  })
    .then(() => {
      message.success(t('Retention Update Success'));
      getObjectRetentionFn();
    })
    .finally(() => {
      retentionLoading.value = false;
      showRetentionView.value = false;
    });
};

const resetRetention = () => {
  retentionMode.value = null;
  retainUntilDate.value = null;
};

/**======================================================= */

// 删除标签
const handledeleteTag = async (index: number) => {
  const { putObjectTagging } = useObject({ bucket: bucketName.value });
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
  const { putObjectTagging } = useObject({ bucket: bucketName.value });
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

const object = ref();
const loading = ref('pending');
const signedUrl = ref('');

const getObject = () => {
  objectApi.headObject(key.value).then(async (res: any) => {
    object.value = res;
    loading.value = 'fulfilled';
    signedUrl.value = await objectApi.getSignedUrl(key.value);
  });
};

const refreshSignedUrl = async () => {
  try {
    signedUrl.value = await objectApi.getSignedUrl(key.value);
    message.success(t('Get Success'));
  } catch (error) {
    message.error(t('Get Failed'));
  } finally {
  }
};
const dialog = useDialog();

// 复制
import ClipboardJS from 'clipboard';
const clipboard = new ClipboardJS('#signedUrlBtn');
clipboard.on('success', function (e) {
  message.success(t('Copy Success'));
  e.clearSelection();
});
// 这里成功的时候也响应error，所以这里也加上
clipboard.on('error', function (e) {
  message.success(t('Copy Success'));
});
onUnmounted(() => {
  clipboard.destroy();
});

const download = async () => {
  const msg = message.loading(t('Getting URL'));
  await refreshSignedUrl();
  const url = await objectApi.getSignedUrl(key.value);
  msg.destroy();
  window.open(url, '_blank');
};

// 版本

const showVersions = ref(false);
const previewVersionId = ref<string | null>(null);

const geVersions = async () => {
  showVersions.value = true;
};

function handlePreviewVersion(versionId: string) {
  previewVersionId.value = versionId;
  showPreview.value = true;
}
</script>
