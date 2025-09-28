<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    :title="t('Add Bucket Replication Rule', { bucket: bucketName })"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-card>
      <n-form label-placement="left" :label-width="100" ref="formRef" :model="formData">
        <n-form-item :label="t('Priority')" path="level">
          <n-input v-model:value="formData.level" :placeholder="t('Please enter priority')" />
        </n-form-item>
        <n-form-item :label="t('Target Address')" path="endpoint">
          <n-input
            v-model:value="formData.endpoint"
            :placeholder="t('Please enter target address') + ':127.0.0.1:9000'"
          />
        </n-form-item>
        <n-form-item :label="t('Use TLS')" path="tls">
          <n-switch v-model:value="formData.tls" :round="false" />
        </n-form-item>
        <n-form-item :label="t('Access Key')" path="accesskey">
          <n-input v-model:value="formData.accesskey" :placeholder="t('Please enter Access Key')" />
        </n-form-item>
        <n-form-item :label="t('Secret Key')" path="secrretkey">
          <n-input v-model:value="formData.secrretkey" :placeholder="t('Please enter Secret Key')" />
        </n-form-item>
        <n-form-item :label="t('Target Bucket')" path="bucket">
          <n-input v-model:value="formData.bucket" :placeholder="t('Please enter target bucket')" />
        </n-form-item>
        <n-form-item :label="t('Region')" path="region">
          <n-input v-model:value="formData.region" :placeholder="t('Please enter region')" />
        </n-form-item>
        <n-form-item :label="t('Replication Mode')" path="modeType">
          <n-select
            v-model:value="formData.modeType"
            :placeholder="t('Please select replication mode')"
            filterable
            :options="modes"
          />
        </n-form-item>

        <n-form-item v-if="formData.modeType === 'async'" :label="t('Bandwidth')" path="bandwidth">
          <n-input-group>
            <n-input v-model:value="formData.bandwidth" :placeholder="t('Please enter bandwidth')" />
            <n-select
              v-model:value="formData.unit"
              :placeholder="t('Please select unit')"
              filterable
              :options="units"
            />
          </n-input-group>
        </n-form-item>
        <n-form-item :label="t('Health Check Duration')" path="timecheck">
          <n-input v-model:value="formData.timecheck" :placeholder="t('Please enter health check duration')">
            <template #suffix>s</template>
          </n-input>
        </n-form-item>
        <n-form-item :label="t('Storage Type')" path="storageType">
          <n-input v-model:value="formData.storageType" :placeholder="t('Please enter storage type')" />
        </n-form-item>

        <!-- 对象搜索 -->
        <n-card :title="t('Object Search')">
          <n-form-item :label="t('Prefix')">
            <n-input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
          </n-form-item>
          <n-form-item :label="t('Tags')">
            <n-dynamic-input
              v-model:value="formData.tags"
              preset="pair"
              :key-placeholder="t('Tag Name')"
              :value-placeholder="t('Tag Value')"
            />
          </n-form-item>
        </n-card>

        <!-- 复制选项 -->
        <n-card class="my-4">
          <n-collapse>
            <n-collapse-item :title="t('Replication Options')" name="advanced">
              <div style="text-align: right">
                <n-form-item :label="t('Existing Objects')">
                  <n-space align="center" justify="end">
                    <n-switch v-model:value="formData.existingObject" :round="false" />
                    <span class="ml-4 text-gray-500">{{ t('Replicate existing objects') }}</span>
                  </n-space>
                </n-form-item>
                <!-- <n-form-item :label="t('Metadata Sync')">
                  <n-space align="center" justify="end">
                    <n-switch v-model:value="formData.deleteAllExpired" :round="false" />
                    <span class="ml-4 text-gray-500">{{ t("Sync metadata") }}</span>
                  </n-space>
                </n-form-item> -->
                <n-form-item :label="t('Delete Marker')">
                  <n-space align="center" justify="end">
                    <n-switch v-model:value="formData.expiredDeleteMark" :round="false" />
                    <span class="ml-4 text-gray-500">{{ t('Replicate soft delete') }}</span>
                  </n-space>
                </n-form-item>
                <!-- <n-form-item :label="t('Delete')">
                  <n-space align="center" justify="end">
                    <n-switch v-model:value="formData.deleteforever" :round="false" />
                    <span class="ml-4 text-gray-500">{{ t("Replicate version delete") }}</span>
                  </n-space>
                </n-form-item> -->
              </div>
            </n-collapse-item>
          </n-collapse>
        </n-card>

        <n-space justify="center">
          <n-button @click="handleCancel">{{ t('Cancel') }}</n-button>
          <n-button type="primary" @click="handleSave">{{ t('Save') }}</n-button>
        </n-space>
      </n-form>
    </n-card>
  </n-modal>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NForm, NFormItem, NInput, NDynamicInput, NCollapse, NCollapseItem, NSwitch, NButton } from 'naive-ui';
import { useBucket } from '@/composables/useBucket';
import { getBytes } from '@/utils/functions';

const { t } = useI18n();

const modes = [
  {
    label: t('Sync'),
    value: 'sync',
  },
  {
    label: t('Async'),
    value: 'async',
  },
];

const units = [
  {
    label: 'Mi',
    value: 'Mi',
  },
  {
    label: 'Gi',
    value: 'Gi',
  },
  {
    label: 'Ti',
    value: 'Ti',
  },
  {
    label: 'Pi',
    value: 'Pi',
  },
  {
    label: 'Ei',
    value: 'Ei',
  },
];

const formRef = ref(null);
const formData = ref({
  level: '1',
  endpoint: '',
  tls: false,
  accesskey: '',
  secrretkey: '',
  bucket: '',
  region: 'us-east-1',
  modeType: 'async',
  timecheck: '60',
  unit: 'Gi',
  bandwidth: 100,
  storageType: 'STANDARD',
  prefix: '',
  tags: [
    {
      key: '',
      value: '',
    },
  ],
  existingObject: true,
  expiredDeleteMark: true,
  // deleteAllExpired: false,
  delete: false,
  deleteforever: false,
});

const props = defineProps({
  bucketName: {
    type: String,
    required: true,
  },
});

const visible = ref(false);
const open = () => {
  visible.value = true;
};

defineExpose({
  open,
});

const emit = defineEmits(['success']);
// 创建远程复制目标
const { setRemoteReplicationTarget, putBucketReplication, getBucketReplication } = useBucket({});
const handleSave = async () => {
  formRef.value?.validate(async errors => {
    if (!errors) {
      try {
        let config = {
          sourcebucket: props.bucketName,
          endpoint: formData.value.endpoint,
          credentials: {
            accessKey: formData.value.accesskey,
            secretKey: formData.value.secrretkey,
            expiration: '0001-01-01T00:00:00Z',
          },
          targetbucket: formData.value.bucket,
          secure: formData.value.tls,
          region: formData.value.region,
          path: 'auto',
          api: 's3v4',
          type: 'replication',
          replicationSync: formData.value.modeType === 'sync' ? true : false,
          healthCheckDuration: formData.value.timecheck - 0,
          disableProxy: false,
          resetBeforeDate: '0001-01-01T00:00:00Z',
          totalDowntime: 0,
          lastOnline: '0001-01-01T00:00:00Z',
          isOnline: false,
          latency: {
            curr: 0,
            avg: 0,
            max: 0,
          },
          edge: false,
          edgeSyncBeforeExpiry: false,
        };

        // 添加带宽
        if (formData.value.modeType === 'async') {
          // 根据单位转化为字节
          config.bandwidth = Number(getBytes(formData.value.bandwidth, formData.value.unit, true)) || 0;
        }
        let targetRESP = await setRemoteReplicationTarget(props.bucketName, config);

        if (!targetRESP) {
          return;
        }

        // 获取已有的 replication 配置
        let oldConfig = null;
        try {
          oldConfig = await getBucketReplication(props.bucketName);
        } catch (e) {
          console.log(e);
          // 没有配置时会报错，忽略即可
        }

        // 构造新规则
        const newRule = {
          ID: `replication-rule-${Date.now()}`,
          Status: 'Enabled',
          Priority: parseInt(formData.value.level) || 1,
          Filter: (() => {
            const filter = {};
            if (formData.value.prefix) {
              filter.Prefix = formData.value.prefix;
            }
            const validTags = formData.value.tags.filter(tag => tag.key && tag.value);
            if (validTags.length > 0) {
              if (validTags.length === 1) {
                filter.Tag = {
                  Key: validTags[0].key,
                  Value: validTags[0].value,
                };
              } else {
                filter.And = {
                  Prefix: formData.value.prefix || '',
                  Tags: validTags.map(tag => ({
                    Key: tag.key,
                    Value: tag.value,
                  })),
                };
              }
            }
            return filter;
          })(),
          SourceSelectionCriteria: {
            SseKmsEncryptedObjects: {
              Status: 'Enabled',
            },
          },
          ExistingObjectReplication: {
            Status: formData.value.existingObject ? 'Enabled' : 'Disabled',
          },
          DeleteMarkerReplication: {
            Status: formData.value.expiredDeleteMark ? 'Enabled' : 'Disabled',
          },
          Destination: {
            Bucket: targetRESP,
            StorageClass: formData.value.storageType ? formData.value.storageType.toUpperCase() : 'STANDARD',
            // ReplicateDelete: formData.value.deleteforever ? "Enabled" : "Disabled",
          },
        };

        // 合并规则
        let rules = [];
        if (
          oldConfig &&
          oldConfig.ReplicationConfiguration &&
          Array.isArray(oldConfig.ReplicationConfiguration.Rules)
        ) {
          // 如果有 oldConfig.ReplicationConfiguration.Rules
          targetRESP = null;
          // 查找是否有存在的Destination Bucket,如果存在则替换整个规则
          const findOne = oldConfig.ReplicationConfiguration.Rules.find(rule => rule.Destination.Bucket === targetRESP);
          if (findOne) {
            // 如果有则替换
            rules = [...oldConfig.ReplicationConfiguration.Rules].splice(
              oldConfig.ReplicationConfiguration.Rules.indexOf(findOne),
              1,
              newRule
            );
          } else {
            rules = [...oldConfig.ReplicationConfiguration.Rules, newRule];
          }
        } else {
          rules = [newRule];
        }

        const params = {
          Role: targetRESP,
          Rules: rules,
        };

        // 创建复制规则
        await putBucketReplication(props.bucketName, params);

        emit('success');
        handleCancel();
      } catch (e) {
        console.log('🚀 ~ handleSave ~ e:', e);
        window.$message?.error?.(t('Save failed'));
      }
    }
  });
};

const handleCancel = () => {
  // 取消逻辑
  visible.value = false;
  formData = ref({
    level: '1',
    endpoint: '',
    tls: false,
    accesskey: '',
    secrretkey: '',
    bucket: '',
    region: 'us-east-1',
    modeType: 'async',
    timecheck: '60',
    unit: 'Gi',
    bandwidth: 100,
    storageType: 'STANDARD',
    prefix: '',
    tags: [
      {
        key: '',
        value: '',
      },
    ],
    existingObject: true,
    expiredDeleteMark: true,
    // deleteAllExpired: false,
    delete: false,
    deleteforever: false,
  });
};
</script>
