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
    }">
    <n-card>
      <n-form class="my-4" ref="formRef" :model="formData">
        <n-tabs default-value="expire" justify-content="space-evenly" type="line" @update:value="handleUpdateValue">
          <n-tab-pane name="expire" :tab="t('Expiration')">
            <n-form-item :label="t('Object Version')" path="versionType" v-if="versioningStatus">
              <n-select v-model:value="formData.versionType" :options="versionOptions" />
            </n-form-item>
            <n-form-item label="时间周期" path="type">
              <div class="w-full flex items-center justify-between">
                <n-input-number
                  class="flex-auto"
                  v-model:value="formData.days"
                  :min="1"
                  :placeholder="t('Days')"
                  style="width: 100px" />
                <span class="ms-4">{{ t("Days After") }}</span>
              </div>
            </n-form-item>
            <!-- 生命周期 -->
            <n-card>
              <n-collapse>
                <n-collapse-item :title="t('More Configurations')" name="advanced">
                  <n-form-item :label="t('Prefix')">
                    <n-input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
                  </n-form-item>
                  <n-form-item :label="t('Tags')">
                    <n-dynamic-input
                      v-model:value="formData.tags"
                      preset="pair"
                      :key-placeholder="t('Tag Name')"
                      :value-placeholder="t('Tag Value')" />
                  </n-form-item>
                </n-collapse-item>
              </n-collapse>
            </n-card>
            <!-- 高级设置 -->
            <n-card class="my-4" v-if="formData.versionType == 'non-current'">
              <n-collapse>
                <n-collapse-item title="高级设置" name="advanced">
                  <n-form-item label="删除标记处理">
                    <n-space>
                      <n-switch v-model:value="formData.expiredDeleteMark" :round="false" />
                      <span class="ml-4 text-gray-500">如果没有留下任何版本，请删除对该对象的引用</span>
                    </n-space>
                  </n-form-item>

                  <!-- <n-form-item label="版本清理">
                    <n-space >
                      <n-switch
                        v-model:value="formData.deleteAllExpired"
                        :round="false"
                      />
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
            <n-form-item :label="t('Time Cycle')" path="type">
              <div class="w-full flex items-center justify-between">
                <n-input-number
                  class="flex-auto"
                  v-model:value="formData.days"
                  :min="1"
                  :placeholder="t('Days')"
                  style="width: 100px" />
                <span class="ms-4">{{ t("Days After") }}</span>
              </div>
            </n-form-item>
            <n-form-item :label="t('Stroage Type')" path="storageType">
              <n-select v-model:value="formData.storageType" :options="tiers" />
            </n-form-item>

            <!-- 生命周期 -->
            <n-card>
              <n-collapse>
                <n-collapse-item :title="t('More Configurations')" name="advanced">
                  <n-form-item :label="t('Prefix')">
                    <n-input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
                  </n-form-item>
                  <n-form-item :label="t('Tags')">
                    <n-dynamic-input
                      v-model:value="formData.tags"
                      preset="pair"
                      :key-placeholder="t('Tag Name')"
                      :value-placeholder="t('Tag Value')" />
                  </n-form-item>
                </n-collapse-item>
              </n-collapse>
            </n-card>
          </n-tab-pane>
        </n-tabs>
      </n-form>

      <n-space justify="center">
        <n-button @click="handleCancel">{{ t("Cancel") }}</n-button>
        <n-button type="primary" @click="handleSave">{{ t("Save") }}</n-button>
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
} from "naive-ui";
import { randomUUID } from "uncrypto";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
const { putBucketLifecycleConfiguration, getBucketVersioning } = useBucket({});
const { listTiers } = useTiers();
const { t } = useI18n();
const message = useMessage();
// 定义 tiers 数据结构的接口
interface TierItem {
  label: string;
  value: string;
}

const emit = defineEmits(["search"]);
const formRef = ref();
const formData = ref({
  ruleName: "",
  type: null,
  versionType: "current",
  days: null,
  action: "transition",
  prefix: "",
  expiredDeleteMark: false,
  deleteAllExpired: false,
  storageType: "",
  tags: [
    {
      key: "",
      value: "",
    },
  ],
});

const versionOptions = ref([
  { label: t("Current Version"), value: "current" },
  { label: t("Non-current Version"), value: "non-current" },
]);

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
  (newVal) => {
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
  if (value === "expire") {
    formData.value.action = "expire";
  } else {
    formData.value.action = "transition";
  }
};

const handleSave = () => {
  formRef.value?.validate((errors: any) => {
    if (!errors) {
      // 调用保存接口
      // const params = {
      //     Rules: [
      //       {
      //         Status: 'Enabled',
      //         Filter: {
      //           Prefix: formData.value.prefix || '',
      //           Tag: formData.value.tags.filter(item => item.key && item.value).map(item => {
      //             return {
      //               Key: item.key,
      //               Value: item.value
      //             }
      //           }) || []
      //         },
      //         Expiration: {
      //           Date: new Date(),
      //           Days: formData.value.days,
      //         },
      //       }
      //     ]
      // }

      const params = {
        Rules: [
          {
            Status: "Enabled",
            Filter: {
              Prefix: "logs/", // 仅对 logs/ 前缀的对象生效
            },
            Expiration: {
              // "Days": 7,
            },
            Transition: {
              Days: 7,
              StorageClass: "MINIO",
            },
          },
        ],
      };

      // const params = {
      //   Rules: [
      //     {
      //        "ID": randomUUID(),
      //         "Expiration": {
      //         },
      //         "Status": "Enabled",
      //         "Transition": {
      //             "Days": 3,
      //             "StorageClass": "MINIO"
      //         }
      //     },
      //     {
      //      "ID": randomUUID(),
      //         "Expiration": {
      //             "Days": 5
      //         },
      //         "Status": "Disabled",
      //         "Transition": {
      //         }
      //     },
      //     {
      //       "ID": randomUUID(),
      //         "Expiration": {
      //         },
      //         "Status": "Enabled",
      //         "Transition": {
      //             "StorageClass": "MINIO",
      //             "Days": 4
      //         }
      //     },
      //     {
      //       "ID": randomUUID(),
      //         "Expiration": {
      //             "Days": 3
      //         },
      //         "Status": "Enabled",
      //         "Transition": {
      //         }
      //     },
      //     {
      //       "ID": randomUUID(),
      //         "Expiration": {
      //             "Days": 5
      //         },
      //         "Status": "Enabled",
      //         "Transition": {
      //         }
      //     },
      //     {
      //       "ID": randomUUID(),
      //         "Expiration": {
      //             "ExpiredObjectDeleteMarker": true,
      //             "Days": 2
      //         },
      //         "Status": "Enabled",
      //         "Transition": {
      //         }
      //     },
      //     {
      //       "ID": randomUUID(),
      //         "Expiration": {
      //             "ExpiredObjectDeleteMarker": true,
      //             "Days": 730
      //         },
      //         "Status": "Enabled",
      //         "Transition": {
      //         }
      //     }
      //   ]
      // }

      // const params = {
      //   Rules: [
      //     {
      //      "Status": "Enabled",
      //       "Filter": { "Prefix": "archives/" },
      //       "Transitions": [
      //         {
      //           "StorageClass": "SBHJA",
      //           "Days": 90 // 90天后归档到Glacier
      //         }
      //       ],
      //       "Expiration": {
      //         "Days": 5, // 5天后删除当前版本对象
      //         "ExpiredObjectDeleteMarker": true // 清理过期删除标记
      //       },
      //       "NoncurrentVersionTransitions": [
      //         {
      //           "StorageClass": "SBHJA",
      //           "NoncurrentDays": 5 // 非当前版本180天后转入深度归档
      //         }
      //       ],
      //       "NoncurrentVersionExpiration": {
      //         "NoncurrentDays": 5 // 非当前版本5天后彻底删除
      //       }
      //     }
      //   ]
      // }

      console.log("🚀 ~ formRef.value?.validate ~ params:", params);

      putBucketLifecycleConfiguration(props.bucketName, params)
        .then((res) => {
          visible.value = false;
          emit("search");
          message.success(t("Create Success"));
          formData.value = {
            ruleName: "",
            type: null,
            versionType: "current",
            days: null,
            action: "transition",
            expiredDeleteMark: false,
            deleteAllExpired: false,
            storageType: "",
            prefix: "",
            tags: [
              {
                key: "",
                value: "",
              },
            ],
          };
        })
        .catch((e) => {
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
    versioningStatus.value = resp.Status == "Enabled";
  } catch (error) {
    console.error("获取版本控制状态失败:", error);
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
