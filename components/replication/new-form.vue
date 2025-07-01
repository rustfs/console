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
    }">
    <n-card>
      <n-form label-placement="left" :label-width="100" ref="formRef" :model="formData">
        <n-form-item :label="t('Priority')" path="level">
          <n-input v-model:value="formData.level" :placeholder="t('Please enter priority')" />
        </n-form-item>
        <n-form-item :label="t('Target Address')" path="type">
          <n-input v-model:value="formData.endpoint" :placeholder="t('Please enter target address')" />
        </n-form-item>
        <n-form-item :label="t('Use TLS')" path="tls">
          <n-switch v-model:value="formData.tls" :round="false" />
        </n-form-item>
        <n-form-item :label="t('Access Key')" path="type">
          <n-input v-model:value="formData.accesskey" :placeholder="t('Please enter Access Key')" />
        </n-form-item>
        <n-form-item :label="t('Secret Key')" path="type">
          <n-input v-model:value="formData.secrretkey" :placeholder="t('Please enter Secret Key')" />
        </n-form-item>
        <n-form-item :label="t('Target Bucket')" path="type">
          <n-input v-model:value="formData.bucket" :placeholder="t('Please enter target bucket')" />
        </n-form-item>
        <n-form-item :label="t('Region')" path="type">
          <n-input v-model:value="formData.region" :placeholder="t('Please enter region')" />
        </n-form-item>
        <n-form-item :label="t('Replication Mode')" path="modeType">
          <n-select
            v-model:value="formData.modeType"
            :placeholder="t('Please select replication mode')"
            filterable
            :options="modes" />
        </n-form-item>

        <n-form-item v-if="formData.modeType === 'async'" :label="t('Bandwidth')" path="type">
          <n-input-group>
            <n-input v-model="formData.daikuan" :placeholder="t('Please enter bandwidth')" />
            <n-select
              v-model:value="formData.unit"
              :placeholder="t('Please select unit')"
              filterable
              :options="units" />
          </n-input-group>
        </n-form-item>
        <n-form-item :label="t('Health Check Duration')" path="timecheck">
          <n-input v-model:value="formData.timecheck" :placeholder="t('Please enter health check duration')" />
        </n-form-item>
        <n-form-item :label="t('Storage Type')" path="type">
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
              :value-placeholder="t('Tag Value')" />
          </n-form-item>
        </n-card>

        <!-- 复制选项 -->
        <n-card class="my-4">
          <n-collapse>
            <n-collapse-item :title="t('Replication Options')" name="advanced">
              <div style="text-align: right">
                <n-form-item :label="t('Existing Objects')">
                  <n-space align="center" justify="end">
                    <n-switch v-model:value="formData.expiredDeleteMark" :round="false" />
                    <span class="ml-4 text-gray-500">{{ t("Replicate existing objects") }}</span>
                  </n-space>
                </n-form-item>
                <n-form-item :label="t('Metadata Sync')">
                  <n-space align="center" justify="end">
                    <n-switch v-model:value="formData.deleteAllExpired" :round="false" />
                    <span class="ml-4 text-gray-500">{{ t("Sync metadata") }}</span>
                  </n-space>
                </n-form-item>
                <n-form-item :label="t('Delete Marker')">
                  <n-space align="center" justify="end">
                    <n-switch v-model:value="formData.delete" :round="false" />
                    <span class="ml-4 text-gray-500">{{ t("Replicate soft delete") }}</span>
                  </n-space>
                </n-form-item>
                <n-form-item :label="t('Delete')">
                  <n-space align="center" justify="end">
                    <n-switch v-model:value="formData.deleteforever" :round="false" />
                    <span class="ml-4 text-gray-500">{{ t("Replicate version delete") }}</span>
                  </n-space>
                </n-form-item>
              </div>
            </n-collapse-item>
          </n-collapse>
        </n-card>

        <n-space justify="center">
          <n-button @click="handleCancel">{{ t("Cancel") }}</n-button>
          <n-button type="primary" @click="handleSave">{{ t("Save") }}</n-button>
        </n-space>
      </n-form>
    </n-card>
  </n-modal>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { NForm, NFormItem, NInput, NDynamicInput, NCollapse, NCollapseItem, NSwitch, NButton } from "naive-ui";
import { useBucket } from "@/composables/useBucket";

const { t } = useI18n();

const modes = [
  {
    label: t("Sync"),
    value: "sync",
  },
  {
    label: t("Async"),
    value: "async",
  },
];

const units = [
  {
    label: "Mi",
    value: "Mi",
  },
  {
    label: "Gi",
    value: "Gi",
  },
  {
    label: "Ti",
    value: "Ti",
  },
  {
    label: "Pi",
    value: "Pi",
  },
  {
    label: "Ei",
    value: "Ei",
  },
];

const formRef = ref(null);
const formData = ref({
  level: "1",
  timecheck: "60",
  modeType: "sync",
  type: null,
  unit: "Mi",
  tags: [
    {
      key: "",
      value: "",
    },
  ],
  expiredDeleteMark: false,
  deleteAllExpired: false,
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

const emit = defineEmits(["success"]);

function genRuleId() {
  return "rule-" + Math.random().toString(36).substr(2, 9) + Date.now();
}

const handleSave = async () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      try {
        const { putBucketReplication } = useBucket({});
        const config = {
          Role: formData.value.role || "arn:aws:iam::xxxx:role/xxx",
          Rules: [
            {
              ID: genRuleId(),
              Status: "Enabled",
              Priority: Number(formData.value.level),
              DeleteMarkerReplication: {
                Status: formData.value.delete ? "Enabled" : "Disabled",
              },
              Filter: {
                And: {
                  Prefix: formData.value.prefix,
                  Tag: (formData.value.tags || [])
                    .filter((tag) => tag.key && tag.value)
                    .map((tag) => ({
                      Key: tag.key,
                      Value: tag.value,
                    })),
                },
              },
              Destination: {
                Bucket: `arn:aws:s3:::${formData.value.bucket}`,
                ...(formData.value.metricsStatus && formData.value.metricsMinutes
                  ? {
                      Metrics: {
                        Status: formData.value.metricsStatus,
                        EventThreshold: {
                          Minutes: Number(formData.value.metricsMinutes),
                        },
                      },
                    }
                  : {}),
                ...(formData.value.replicationTimeStatus && formData.value.replicationTimeMinutes
                  ? {
                      ReplicationTime: {
                        Status: formData.value.replicationTimeStatus,
                        Time: {
                          Minutes: Number(formData.value.replicationTimeMinutes),
                        },
                      },
                    }
                  : {}),
                ...(formData.value.modeType === "async" && formData.value.daikuan
                  ? {
                      Bandwidth: {
                        Value: formData.value.daikuan,
                        Unit: formData.value.unit,
                      },
                    }
                  : {}),
              },
            },
          ],
        };
        console.log("🚀 ~ formRef.value?.validate ~ config:", config);

        await putBucketReplication(props.bucketName, config);
        emit("success");
        visible.value = false;
      } catch (e) {
        window.$message?.error?.(t("Save failed"));
      }
    }
  });
};

const handleCancel = () => {
  // 取消逻辑
};
</script>
