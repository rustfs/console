<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    :title="t('Add Lifecycle Rule') + ` (${t('Bucket')}: ${bucketName})`"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-card>
      <n-form class="my-4" ref="formRef" :model="formData" :rules="rules">
        <n-tabs
          default-value="expire"
          justify-content="space-evenly"
          type="line"
          @update:value="handleUpdateValue"
        >
          <n-tab-pane name="expire" :tab="t('Expiration')">
            <n-form-item :label="t('Object Version')" path="versionType" v-if="versioningStatus">
              <n-select v-model:value="formData.versionType" :options="versionOptions" />
            </n-form-item>
            <n-form-item :label="t('Time Cycle')" path="days">
              <div class="w-full flex items-center justify-between">
                <n-input-number
                  class="flex-auto"
                  v-model:value="formData.days"
                  :min="1"
                  :placeholder="t('Days')"
                  style="width: 100px"
                />
                <span class="ms-4">{{ t('Days After') }}</span>
              </div>
            </n-form-item>
            <!-- 生命周期 -->
            <n-card>
              <n-collapse>
                <n-collapse-item :title="t('More Configurations')" name="advanced">
                  <n-form-item :label="t('Prefix')">
                    <n-input
                      v-model:value="formData.prefix"
                      :placeholder="t('Please enter prefix')"
                    />
                  </n-form-item>
                  <n-form-item :label="t('Tags')">
                    <n-dynamic-input
                      v-model:value="formData.tags"
                      preset="pair"
                      :key-placeholder="t('Tag Name')"
                      :value-placeholder="t('Tag Value')"
                    />
                  </n-form-item>
                </n-collapse-item>
              </n-collapse>
            </n-card>
            <!-- 高级设置 -->
            <n-card class="my-4" v-if="formData.versionType == 'current'">
              <n-collapse>
                <n-collapse-item :title="t('Advanced Settings')" name="advanced">
                  <n-form-item :label="t('Delete Marker Handling')">
                    <n-space>
                      <n-switch v-model:value="formData.expiredDeleteMark" :round="false" />
                      <span class="ml-4 text-gray-500">{{
                        t('If no versions remain, delete references to this object')
                      }}</span>
                    </n-space>
                  </n-form-item>

                  <!-- <n-form-item label="版本清理">
                    <n-space>
                      <n-switch v-model:value="formData.deleteAllExpired" :round="false" />
                      <span class="ml-4 text-gray-500">删除所有过期版本</span>
                    </n-space>
                  </n-form-item> -->
                </n-collapse-item>
              </n-collapse>
            </n-card>
          </n-tab-pane>
          <n-tab-pane name="transition" :tab="t('Transition')">
            <n-form-item :label="t('Object Version')" path="versionType" v-if="versioningStatus">
              <n-select v-model:value="formData.versionType" :options="versionOptions" />
            </n-form-item>
            <n-form-item :label="t('Time Cycle')" path="days">
              <div class="w-full flex items-center justify-between">
                <n-input-number
                  class="flex-auto"
                  v-model:value="formData.days"
                  :min="1"
                  :placeholder="t('Days')"
                  style="width: 100px"
                />
                <span class="ms-4">{{ t('Days After') }}</span>
              </div>
            </n-form-item>
            <n-form-item :label="t('Storage Type')" path="storageType">
              <n-select v-model:value="formData.storageType" :options="tiers" />
            </n-form-item>

            <!-- 生命周期 -->
            <n-card>
              <n-collapse>
                <n-collapse-item :title="t('More Configurations')" name="advanced">
                  <n-form-item :label="t('Prefix')">
                    <n-input
                      v-model:value="formData.prefix"
                      :placeholder="t('Please enter prefix')"
                    />
                  </n-form-item>
                  <n-form-item :label="t('Tags')">
                    <n-dynamic-input
                      v-model:value="formData.tags"
                      preset="pair"
                      :key-placeholder="t('Tag Name')"
                      :value-placeholder="t('Tag Value')"
                    />
                  </n-form-item>
                </n-collapse-item>
              </n-collapse>
            </n-card>
          </n-tab-pane>
        </n-tabs>
      </n-form>

      <n-space justify="center">
        <n-button @click="handleCancel">{{ t('Cancel') }}</n-button>
        <n-button type="primary" @click="handleSave">{{ t('Save') }}</n-button>
      </n-space>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import {
  NButton,
  NCollapse,
  NCollapseItem,
  NDynamicInput,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
} from 'naive-ui';
// 使用 Web Crypto API 或 Node.js crypto 模块
const randomUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 兜底方案
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
const { putBucketLifecycleConfiguration, getBucketVersioning, getBucketLifecycleConfiguration } =
  useBucket({});
const { listTiers } = useTiers();
const { t } = useI18n();
const message = useMessage();
// 定义 tiers 数据结构的接口
interface TierItem {
  label: string;
  value: string;
}

const emit = defineEmits(['search']);
const formRef = ref();
const formData = ref({
  ruleName: '',
  type: null,
  versionType: 'current',
  days: null,
  action: 'expire',
  prefix: '',
  expiredDeleteMark: false,
  deleteAllExpired: false,
  storageType: '',
  tags: [
    {
      key: '',
      value: '',
    },
  ],
});

const versionOptions = ref([
  { label: t('Current Version'), value: 'current' },
  { label: t('Non-current Version'), value: 'non-current' },
]);

// 表单验证规则
const rules = {
  days: {
    required: true,
    validator: (rule: any, value: any) => {
      if (value === null || value === undefined || value < 1) {
        return new Error(t('Please enter valid days'));
      }
      return true;
    },
    trigger: ['blur', 'input', 'change'],
  },
  storageType: {
    validator: (rule: any, value: any) => {
      // 只在 transition 模式下验证 storageType
      if (formData.value.action === 'transition' && (!value || value === '')) {
        return new Error(t('Please select storage type'));
      }
      return true;
    },
    trigger: ['blur', 'change'],
  },
};

const props = defineProps({
  bucketName: {
    type: String,
    required: true,
  },
  // 已经存在的生命周期
  lifecycleList: {
    type: Array,
    default: () => [],
  },
});

watch(
  () => props.bucketName,
  newVal => {
    // 获取是都开启版本管理
    getVersioningStatus();
  }
);

const visible = ref(false);
const open = () => {
  visible.value = true;
};

defineExpose({
  open,
});

const handleUpdateValue = (value: string) => {
  if (value === 'expire') {
    formData.value.action = 'expire';
  } else {
    formData.value.action = 'transition';
  }
};

const handleSave = () => {
  formRef.value?.validate((errors: any) => {
    if (!errors) {
      // 额外的参数验证（与表单验证保持一致）
      if (
        formData.value.days === null ||
        formData.value.days === undefined ||
        formData.value.days < 1
      ) {
        message.error(t('Please enter valid days'));
        return;
      }

      if (
        formData.value.action === 'transition' &&
        (!formData.value.storageType || formData.value.storageType === '')
      ) {
        message.error(t('Please select storage type'));
        return;
      }

      // 先获取当前的生命周期配置
      getBucketLifecycleConfiguration(props.bucketName)
        .then(currentConfig => {
          // 创建新的规则
          const newRule: any = {
            ID: randomUUID(),
            Status: 'Enabled',
          };

          // 设置 Filter 或 Prefix（不能同时使用）
          console.log('formData.value.prefix:', formData.value.prefix);
          console.log('formData.value.tags:', formData.value.tags);
          console.log('formData.value.expiredDeleteMark:', formData.value.expiredDeleteMark);

          // 检查是否有有效的标签
          const validTags = formData.value.tags.filter((item: any) => item.key && item.value);
          const hasValidTags = validTags.length > 0;

          if (formData.value.prefix || hasValidTags) {
            newRule.Filter = {};

            if (hasValidTags) {
              if (validTags.length === 1) {
                newRule.Filter.Tag = {
                  Key: validTags[0].key,
                  Value: validTags[0].value,
                };
                if (formData.value.prefix) {
                  newRule.Filter.Prefix = formData.value.prefix;
                }
              } else {
                newRule.Filter.And = {
                  Tags: validTags.map((item: any) => ({
                    Key: item.key,
                    Value: item.value,
                  })),
                };
                if (formData.value.prefix) {
                  newRule.Filter.And.Prefix = formData.value.prefix;
                }
              }
            } else {
              // 只有前缀时，直接添加到 Filter
              newRule.Filter.Prefix = formData.value.prefix;
            }
          }

          // 根据操作类型添加相应的配置
          if (formData.value.action === 'expire') {
            if (formData.value.versionType === 'non-current') {
              newRule.NoncurrentVersionExpiration = {
                NoncurrentDays: formData.value.days,
              };

              // 如果启用了删除标记处理
              if (formData.value.expiredDeleteMark) {
                newRule.ExpiredObjectDeleteMarker = true;
              }
            } else {
              newRule.Expiration = {
                Days: formData.value.days,
              };

              // 如果启用了删除标记处理（当前版本也支持）
              if (formData.value.expiredDeleteMark) {
                newRule.Expiration.ExpiredObjectDeleteMarker = true;
              }
            }
          } else {
            // transition 操作
            if (formData.value.versionType === 'non-current') {
              newRule.NoncurrentVersionTransitions = [
                {
                  NoncurrentDays: formData.value.days,
                  StorageClass: formData.value.storageType,
                },
              ];
            } else {
              newRule.Transitions = [
                {
                  Days: formData.value.days,
                  StorageClass: formData.value.storageType,
                },
              ];
            }
          }

          // 合并现有规则和新规则
          const existingRules = currentConfig.Rules || [];
          const updatedRules = [...existingRules, newRule];

          // 调用保存接口
          const params = {
            Rules: updatedRules,
          };

          return putBucketLifecycleConfiguration(props.bucketName, params);
        })
        .then(res => {
          visible.value = false;
          emit('search');
          message.success(t('Create Success'));
          formData.value = {
            ruleName: '',
            type: null,
            versionType: 'current',
            days: null,
            action: 'expire',
            expiredDeleteMark: false,
            deleteAllExpired: false,
            storageType: '',
            prefix: '',
            tags: [
              {
                key: '',
                value: '',
              },
            ],
          };
        })
        .catch(e => {
          message.error(e.message);
        });
    }
  });
};

// 分层列表
const tiers = ref<TierItem[]>([]);
const getTiers = async () => {
  const res = await listTiers();
  if (res) {
    tiers.value = res.map((item: any) => {
      return {
        label: item[item.type].name,
        value: item[item.type].name,
      };
    });
  }
  if (tiers.value.length) {
    formData.value.storageType = tiers.value[0].value;
  }
};
getTiers();

// 获取版本控制状态
const versioningStatus: any = ref(false);
const getVersioningStatus = async () => {
  try {
    const resp = await getBucketVersioning(props.bucketName);
    versioningStatus.value = resp.Status == 'Enabled';
  } catch (error) {
    console.error('获取版本控制状态失败:', error);
  }
};

onMounted(() => {
  getVersioningStatus();
});
const handleCancel = () => {
  // 取消逻辑
  visible.value = false;
};
</script>
