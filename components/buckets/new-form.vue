<template>
  <n-modal :show="show" @update:show="(val: boolean) => $emit('update:show', val)" size="huge">
    <n-card class="max-w-screen-sm">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>{{ t("Create Bucket") }}</span>
          <n-button size="small" ghost @click="closeModal">{{ t("Close") }}</n-button>
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <!-- <div class="flex items-center gap-4">
          <div>新建存储桶</div>
          <div class="text-cyan-600">{{ bucketName }}{{ prefix || '/' }}</div>
        </div> -->

        <!-- <n-alert title="" type="info">
          若上传路径中存在同名文件，上传将覆盖原有文件。
        </n-alert> -->

        <div class="flex items-center gap-4">
          <n-input :placeholder="t('Please enter name')" v-model:value="objectKey" />
        </div>
        <div class="flex items-center justify-between gap-4">
          <n-space class="w-24">{{ t("Version") }}:</n-space>
          <n-switch v-model:value="version" @update:value="handleVersionChange" />
        </div>
        <div class="flex items-center justify-between gap-4">
          <n-space class="w-24">{{ t("Object Lock") }}:</n-space>
          <n-switch v-model:value="objectLock" @update:value="handleObjectLock" />
        </div>

        <!-- Retention 配置区块，仅对象锁开启时显示 -->
        <div v-if="objectLock" class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-4">
            <n-space class="w-24">{{ t("Retention") }}</n-space>
            <n-switch v-model:value="retentionEnabled" />
          </div>
          <div v-if="retentionEnabled">
            <div class="flex items-center justify-between gap-4">
              <n-space class="w-24">{{ t("Retention Mode") }}:</n-space>
              <n-radio-group v-model:value="retentionMode">
                <n-radio value="COMPLIANCE">{{ t("COMPLIANCE") }}</n-radio>
                <n-radio value="GOVERNANCE">{{ t("GOVERNANCE") }}</n-radio>
              </n-radio-group>
            </div>
            <div class="flex items-center justify-between gap-4">
              <n-space class="w-24">{{ t("Validity") }}*</n-space>
              <n-input-group class="justify-end">
                <n-input-number v-model:value="retentionPeriod" :min="1" class="w-96" />
                <n-select v-model:value="retentionUnit" :options="retentionUnitOptions" class="w-16" />
              </n-input-group>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-4">
          <n-button type="primary" :disabled="objectKey.trim().length < 1" @click="handlePutObject">
            {{ t("Create") }}
          </n-button>
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { defineEmits, defineProps } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const emit = defineEmits(["update:show"]);

const props = defineProps<{ show: boolean }>();

const closeModal = () => emit("update:show", false);

const objectKey = ref("");
const version = ref(false);
const objectLock = ref(false);

// Retention 相关变量
const retentionEnabled = ref(false);
const retentionMode = ref("COMPLIANCE");
const retentionPeriod = ref(180);
const retentionUnit = ref("day");
const retentionUnitOptions = [
  { label: t("Day"), value: "day" },
  { label: t("Year"), value: "year" },
];

const { createBucket, putBucketVersioning, putObjectLockConfiguration } = useBucket({});

const $message = useMessage();

// 如果开启对象锁，必须开启版本控制
const handleObjectLock = () => {
  if (objectLock.value) {
    version.value = true;
  }
};

// 如果关闭版本控制，关闭对象锁
const handleVersionChange = () => {
  if (!version.value) {
    objectLock.value = false;
  }
};

const handlePutObject = () => {
  const params: any = {
    Bucket: objectKey.value,
    ObjectLockEnabledForBucket: objectLock.value,
  };
  createBucket(params)
    .then(() => {
      // 开启版本控制
      const afterVersioning = () => {
        // 如果需要设置 retention
        if (objectLock.value && retentionEnabled.value) {
          putObjectLockConfiguration(objectKey.value, {
            ObjectLockEnabled: "Enabled",
            Rule: {
              DefaultRetention: {
                Mode: retentionMode.value,
                Days: retentionUnit.value === "day" ? retentionPeriod.value : undefined,
                Years: retentionUnit.value === "year" ? retentionPeriod.value : undefined,
              },
            },
          })
            .then(() => {
              emit("update:show", false);
              objectKey.value = "";
              $message.success(t("Create Success"));
            })
            .catch((e) => {
              $message.error(t("Retention Save Failed"));
            });
        } else {
          emit("update:show", false);
          objectKey.value = "";
          $message.success(t("Create Success"));
        }
      };

      if (version.value) {
        putBucketVersioning(objectKey.value, version.value ? "Enabled" : "Suspended")
          .then(afterVersioning)
          .catch(() => $message.error(t("Create Failed")));
      } else {
        afterVersioning();
      }
    })
    .catch((e) => {
      $message.error(e.message);
    });
};
</script>
