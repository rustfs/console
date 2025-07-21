<template>
  <n-drawer v-model:show="visibel" :width="502">
    <n-drawer-content :title="t('Bucket Configuration') + `(${bucketName})`" closable>
      <n-descriptions :column="2" label-placement="top" bordered label-class="w-1/2">
        <n-descriptions-item>
          <template #label>
            <span>{{ t('Access Policy') }}</span>
            <n-button class="align-middle" quaternary round type="primary" @click="editPolicy">
              <Icon name="ri:edit-2-line" class="mr-2" />
            </n-button>
          </template>
          {{ policyOptions.find(item => item.value === bucketPolicy)?.label }}
        </n-descriptions-item>

        <n-descriptions-item>
          <template #label>
            <span class="mr-2">{{ t('Encryption') }}</span>
            <n-button class="align-middle" quaternary round type="primary" @click="editEncript">
              <Icon name="ri:edit-2-line" class="mr-2" />
            </n-button>
          </template>
          {{ t('Disabled') }}
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
            {{ t('Tag') }}
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
            @close="handledeleteTag(index)"
          >
            {{ tag.Key }}:{{ tag.Value }}
          </n-tag>
        </n-descriptions-item>

        <n-descriptions-item>
          <template #label>{{ t('Object Lock') }}</template>
          <n-switch
            :disabled="true"
            v-model:value="lockStatus"
            :loading="objectLockLoading"
            :round="false"
            @update:value="handleChangeVersionStatus"
          />
        </n-descriptions-item>

        <n-descriptions-item>
          <template #label>{{ t('Version Control') }}</template>
          <n-switch
            v-model:value="versioningStatus"
            :disabled="lockStatus == true"
            checked-value="Enabled"
            unchecked-value="Suspended"
            :round="false"
            :loading="statusLoading"
            @update:value="handleChangeVersionStatus"
          />
        </n-descriptions-item>
      </n-descriptions>

      <!-- retention -->
      <n-descriptions :column="2" label-placement="top" bordered label-class="w-1/2">
        <n-descriptions-item>
          <template #label>{{ t('Retention') }}</template>
          <n-tag type="success" size="small" v-if="retentionEnabled" @click="editRetention">
            {{ t('Enabled') }}
            <template #icon>
              <Icon name="ri:checkbox-circle-fill" />
            </template>
          </n-tag>
          <n-tag type="error" size="small" v-else @click="editRetention">
            {{ t('Disabled') }}
            <template #icon>
              <Icon name="ri:close-circle-fill" />
            </template>
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item>
          <template #label>{{ t('Retention Mode') }}</template>
          {{ t(retentionFormValue.retentionMode || '') }}
        </n-descriptions-item>

        <n-descriptions-item>
          <template #label>{{ t('Retention Unit') }}</template>
          {{ t(retentionFormValue.retentionUnit || '') }}
        </n-descriptions-item>
        <n-descriptions-item>
          <template #label>{{ t('Retention Period') }}</template>
          {{ retentionFormValue.retentionPeriod || '' }}
        </n-descriptions-item>
      </n-descriptions>
    </n-drawer-content>

    <!-- policy -->
    <n-modal
      v-model:show="showPolicyModal"
      :title="t('Set Policy')"
      preset="card"
      draggable
      :style="{ width: '750px' }"
    >
      <n-form
        ref="policyFormRef"
        :inline="policyFormValue.policy !== 'custom'"
        :label-width="80"
        :model="policyFormValue"
      >
        <n-form-item :label="t('Policy')" path="" class="flex-auto">
          <n-select
            v-model:value="policyFormValue.policy"
            :placeholder="t('Please select policy')"
            :options="policyOptions"
          />
        </n-form-item>
        <n-form-item
          :span="24"
          v-if="policyFormValue.policy == 'custom'"
          :label="t('Policy Content')"
          path="content"
        >
          <n-scrollbar class="w-full max-h-[60vh]"
            ><json-editor v-model="policyFormValue.content"
          /></n-scrollbar>
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="submitPolicyForm">{{ t('Confirm') }}</n-button>
          <n-button class="mx-4" @click="showPolicyModal = false">{{ t('Cancel') }}</n-button>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- tag -->
    <n-modal
      v-model:show="showTagModal"
      :title="t('Set Tag')"
      preset="card"
      draggable
      :style="{ width: '550px' }"
    >
      <n-form ref="formRef" inline :label-width="80" :model="tagFormValue">
        <n-form-item :label="t('Tag Key')" path="name">
          <n-input v-model:value="tagFormValue.name" :placeholder="t('Tag Key Placeholder')" />
        </n-form-item>
        <n-form-item :label="t('Tag Value')" path="value">
          <n-input v-model:value="tagFormValue.value" :placeholder="t('Please enter tag value')" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="submitTagForm">{{ t('Confirm') }}</n-button>
          <n-button class="mx-4" @click="showTagModal = false">{{ t('Cancel') }}</n-button>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- Encrypt -->
    <n-modal
      v-model:show="showEncryptModal"
      :title="t('Enable Storage Encryption')"
      preset="card"
      draggable
      :style="{ width: '550px' }"
    >
      <n-form
        ref="encryptFormRef"
        label-placemen="left"
        label-width="auto"
        inline
        :model="encryptFormValue"
      >
        <n-form-item :label="t('Encryption Type')" path="encrypt" class="flex-auto">
          <n-select
            v-model:value="encryptFormValue.encrypt"
            :placeholder="t('Please select encryption type')"
            :options="encryptOptions"
          />
        </n-form-item>
        <n-form-item
          v-if="encryptFormValue.encrypt == 'SSE-KMS'"
          label="KMS Key ID"
          path="kmsKeyId"
          class="flex-auto"
        >
          <n-select v-model:value="encryptFormValue.kmsKeyId" placeholder="" :options="[]" />
        </n-form-item>

        <n-form-item>
          <n-button type="primary" @click="submitEncryptForm">{{ t('Confirm') }}</n-button>
          <n-button class="mx-4" @click="showEncryptModal = false">{{ t('Cancel') }}</n-button>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- retention -->
    <n-modal
      v-model:show="showRetentionModal"
      :title="t('Set Retention')"
      preset="card"
      draggable
      :style="{ width: '550px' }"
    >
      <n-form
        ref="retentionFormRef"
        label-placemen="left"
        label-width="auto"
        :model="retentionFormValue"
      >
        <n-form-item :label="t('Retention Mode')" path="retentionMode" class="flex-auto">
          <n-radio-group v-model:value="retentionFormValue.retentionMode">
            <n-radio value="COMPLIANCE">{{ t('COMPLIANCE') }}</n-radio>
            <n-radio value="GOVERNANCE">{{ t('GOVERNANCE') }}</n-radio>
          </n-radio-group>
        </n-form-item>

        <n-form-item :label="t('Retention Unit')" path="retentionUnit" class="flex-auto">
          <n-radio-group v-model:value="retentionFormValue.retentionUnit">
            <n-radio value="Days">{{ t('DAYS') }}</n-radio>
            <n-radio value="Years">{{ t('YEARS') }}</n-radio>
          </n-radio-group>
        </n-form-item>

        <n-form-item :label="t('Retention Period')" path="retentionPeriod" class="flex-auto">
          <n-input-number v-model:value="retentionFormValue.retentionPeriod" />
        </n-form-item>

        <n-form-item>
          <n-button type="primary" @click="submitRetentionForm">{{ t('Confirm') }}</n-button>
          <n-button class="mx-4" @click="showRetentionModal = false">{{ t('Cancel') }}</n-button>
        </n-form-item>
      </n-form>
    </n-modal>
  </n-drawer>
</template>

<script setup lang="ts">
import { Icon } from '#components';
const { t } = useI18n();
const dialog = useDialog();
const visibel = ref(false);
const bucketName = ref('');
const openDrawer = (bucket: string) => {
  visibel.value = true;
  bucketName.value = bucket;
  // 在服务端获取数据
  getData();
};
defineExpose({
  openDrawer,
});

const getData = async () => {
  await getTags();
  await getVersioningStatus();
  await getObjectLockConfig();
  // await getBucketEncryptionFn();
  await getbucketPolicy();
};

const message = useMessage();
const {
  getBucketTagging,
  deleteBucket,
  putBucketTagging,
  putBucketVersioning,
  getBucketVersioning,
  getBucketPolicy,
  putBucketPolicy,
  getObjectLockConfiguration,
  putObjectLockConfiguration,
  getBucketEncryption,
  putBucketEncryption,
  deleteBucketEncryption,
} = useBucket({});

/**********object lock ***********************/
const lockStatus = ref(false);
const objectLockLoading = ref(false);
const retentionEnabled = ref(false);

const getObjectLockConfig = async () => {
  objectLockLoading.value = true;
  getObjectLockConfiguration(bucketName.value)
    .then(res => {
      if (res.ObjectLockConfiguration?.ObjectLockEnabled) {
        lockStatus.value =
          res.ObjectLockConfiguration?.ObjectLockEnabled == 'Enabled' ? true : false;
        if (res.ObjectLockConfiguration?.Rule) {
          retentionEnabled.value = true;
          retentionFormValue.value.retentionMode =
            res.ObjectLockConfiguration?.Rule?.DefaultRetention?.Mode || null;
          retentionFormValue.value.retentionPeriod =
            res.ObjectLockConfiguration?.Rule?.DefaultRetention?.Days ||
            res.ObjectLockConfiguration?.Rule?.DefaultRetention?.Years ||
            null;
          retentionFormValue.value.retentionUnit = res.ObjectLockConfiguration?.Rule
            ?.DefaultRetention?.Years
            ? 'Years'
            : res.ObjectLockConfiguration?.Rule?.DefaultRetention?.Days
              ? 'Days'
              : '';
        }
      } else {
        lockStatus.value = false;
        retentionEnabled.value = false;
        retentionFormValue.value.retentionMode = null;
        retentionFormValue.value.retentionPeriod = null;
        retentionFormValue.value.retentionUnit = null;
      }
    })
    .finally(() => {
      objectLockLoading.value = false;
    });
};

/**********object lock ***********************/

/******** policy ***********************/
import { setBucketPolicy, getBucketPolicy as getBucketPolicyFn } from '~/utils/bucket-policy';

const bucketPolicy = ref('public');
const getbucketPolicy = async () => {
  try {
    const res = await getBucketPolicy(bucketName.value);
    if (res.Policy) {
      policyFormValue.value.content = res.Policy;

      bucketPolicy.value = getBucketPolicyFn(
        JSON.parse(res.Policy).Statement,
        bucketName.value,
        ''
      );
      policyFormValue.value.policy = bucketPolicy.value;
      if (bucketPolicy.value == 'none') {
        bucketPolicy.value = 'custom';
        policyFormValue.value.policy = 'custom';
      }
    } else {
      bucketPolicy.value = 'public';
    }
  } catch (error: any) {
    // Handle 404 error when no policy exists
    console.error("Error fetching bucket policy:", error);
    // Set default values for private policy
    bucketPolicy.value = 'private';
    policyFormValue.value.policy = 'private';
    policyFormValue.value.content = '{}';
  }
};

const policyFormValue = ref({
  policy: 'private',
  content: '{}',
});
const showPolicyModal = ref(false);
const editPolicy = () => {
  showPolicyModal.value = true;
};

const submitPolicyForm = () => {
  if (policyFormValue.value.policy == 'custom') {
    let polictStr = JSON.stringify(JSON.parse(policyFormValue.value.content));
    console.log(polictStr);
    putBucketPolicy(bucketName.value, polictStr)
      .then(() => {
        message.success(t('Edit Success'));
        showPolicyModal.value = false;
        getbucketPolicy();
      })
      .catch(error => {
        message.error(t('Edit Failed') + ': ' + error.message);
      });
  } else {
    const policys = setBucketPolicy(
      [],
      policyFormValue.value.policy as BucketPolicyType,
      bucketName.value,
      ''
    );
    console.log('🚀 ~ policys:', policys);
    putBucketPolicy(bucketName.value, JSON.stringify({ Version: '2012-10-17', Statement: policys }))
      .then(() => {
        message.success(t('Edit Success'));
        showPolicyModal.value = false;
        getbucketPolicy();
      })
      .catch(error => {
        message.error(t('Edit Failed') + ': ' + error.message);
      });
  }
};
const policyOptions = [
  {
    label: t('Public'),
    value: 'public',
  },
  {
    label: t('Private'),
    value: 'private',
  },
  {
    label: t('Custom'),
    value: 'custom',
  },
];

/******** policy ***********************/

/********Encrypt ***********************/
const showEncryptModal = ref(false);
const encryptFormValue = ref({
  encrypt: 'disabled',
  kmsKeyId: '',
});

const encryptOptions = [
  {
    label: t('Disabled'),
    value: 'disabled',
  },
  {
    label: 'SSE-KMS',
    value: 'SSE-KMS',
  },
  {
    label: 'SSE-S3',
    value: 'SSE-S3',
  },
];

const getBucketEncryptionFn = async () => {
  const res = await getBucketEncryption(bucketName.value);
  console.log(res);
};
const editEncript = () => {
  showEncryptModal.value = true;
};
const submitEncryptForm = () => {
  // 处理表单提交逻辑
  // console.log("提交表单数据:", encryptFormValue.value)
  // showEncryptModal.value = false
  // if (encryptFormValue.value.encrypt == "disabled") {
  //   deleteBucketEncryption(bucketName.value).then(() => {
  //     message.success("修改成功");
  //     showEncryptModal.value = false;
  //   });
  // } else {
  //   putBucketEncryption(bucketName.value, {
  //     Rules: [
  //       {
  //         ServerSideEncryptionByDefault: {
  //           SSEAlgorithm: encryptFormValue.value.encrypt,
  //           KMSMasterKeyID: encryptFormValue.value.encrypt == "SSE-KMS" ? encryptFormValue.value.kmsKeyId : "",
  //         },
  //       },
  //     ],
  //   }).then(() => {
  //     message.success("修改成功");
  //     showEncryptModal.value = false;
  //   });
  // }
  if (encryptFormValue.value.encrypt == 'SSE-KMS') {
    message.error(
      t(
        'The XML format you provided is incorrect, or has not been validated against our published schema. (MasterKeyID not found aws:kms).'
      )
    );
  } else if (encryptFormValue.value.encrypt == 'SSE-S3') {
    message.error(t('Server-side encryption is specified, but S3 is not configured.'));
  } else {
    message.success(t('Edit Success'));
    showEncryptModal.value = false;
  }
};

/********Encrypt ***********************/

/********versioning ***********************/
const versioningStatus: any = ref('');
const statusLoading = ref(false);
// 获取版本控制状态
const getVersioningStatus = async () => {
  try {
    const resp = await getBucketVersioning(bucketName.value);
    versioningStatus.value = resp.Status;
  } catch (error) {
    console.error('get version fail:', error);
  }
};

const handleChangeVersionStatus = async (value: string) => {
  statusLoading.value = true;
  putBucketVersioning(bucketName.value, value)
    .then(() => {
      message.success(t('Edit Success'));
      getVersioningStatus();
    })
    .finally(() => {
      statusLoading.value = false;
      versioningStatus.value = versioningStatus.value == 'Suspended' ? 'Enabled' : 'Suspended';
    });
};

/********versioning ***********************/

/********tag ***********************/
// 定义标签的类型
interface Tag {
  Key: string;
  Value: string;
}
const showTagModal = ref(false);

const tagFormValue = ref({
  name: '',
  value: '',
});
// 获取标签
const tags = ref<Tag[]>([]);
const getTags = async () => {
  const resp: any = await getBucketTagging(bucketName.value);
  tags.value = resp.TagSet || [];
};

const addTag = () => {
  nowTagIndex.value = -1;
  tagFormValue.value = { name: '', value: '' }; // 清空表单
  showTagModal.value = true;
};

const submitTagForm = () => {
  if (!tagFormValue.value.name || !tagFormValue.value.value) {
    message.error(t('Please fill in complete tag information'));
    return;
  }

  if (nowTagIndex.value === -1) {
    tags.value.push({ Key: tagFormValue.value.name, Value: tagFormValue.value.value });
  }
  if (nowTagIndex.value !== -1) {
    tags.value[nowTagIndex.value] = {
      Key: tagFormValue.value.name,
      Value: tagFormValue.value.value,
    };
  }
  // 调用 putBucketTagging 接口
  putBucketTagging(bucketName.value, { TagSet: tags.value })
    .then(() => {
      showTagModal.value = false; // 关闭模态框
      message.success(t('Tag Update Success'));
    })
    .catch(error => {
      message.error(t('Tag Update Failed') + ': ' + error.message);
    });
};

const nowTagIndex = ref(-1);
// 编辑标签
const editTag = (index: number) => {
  nowTagIndex.value = index;
  const nowTag = tags.value[index];
  tagFormValue.value = { name: nowTag.Key, value: nowTag.Value }; // 填充表单
  showTagModal.value = true; // 打开模态框
};
const handledeleteTag = (index: number) => {
  dialog.error({
    title: t('Warning'),
    content: t('Delete Tag Confirm'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      nowTagIndex.value = index;
      tags.value.splice(index, 1); // 从标签列表中删除

      // 调用 putBucketTagging 接口
      putBucketTagging(bucketName.value, { TagSet: tags.value })
        .then(() => {
          message.success(t('Tag Update Success'));
        })
        .catch(error => {
          message.error(t('Tag Delete Failed') + ': ' + error.message);
        });
    },
  });
};
/********tag ***********************/

/********retention ***********************/
interface RetentionFormValue {
  retentionMode: string | null;
  retentionPeriod: number | null;
  retentionUnit: string | null;
}

const showRetentionModal = ref(false);
const retentionFormValue = ref<RetentionFormValue>({
  retentionMode: null,
  retentionPeriod: null,
  retentionUnit: null,
});

const editRetention = () => {
  if (!lockStatus.value) {
    message.error(t('Object lock is not enabled, cannot set retention'));
    return;
  }
  showRetentionModal.value = true;
};

const submitRetentionForm = () => {
  console.log(retentionFormValue.value);
  if (
    retentionFormValue.value.retentionMode == null ||
    retentionFormValue.value.retentionPeriod == null ||
    retentionFormValue.value.retentionUnit == null
  ) {
    message.error(t('Please fill in complete retention information'));
    return;
  }

  putObjectLockConfiguration(bucketName.value, {
    ObjectLockEnabled: 'Enabled',
    Rule: {
      DefaultRetention: {
        Mode: retentionFormValue.value.retentionMode,
        Days:
          retentionFormValue.value.retentionUnit == 'Days'
            ? retentionFormValue.value.retentionPeriod
            : null,
        Years:
          retentionFormValue.value.retentionUnit == 'Years'
            ? retentionFormValue.value.retentionPeriod
            : null,
      },
    },
  }).then(() => {
    message.success(t('Edit Success'));
    showRetentionModal.value = false;
    getObjectLockConfig();
  });
};

/********retention ***********************/
</script>
