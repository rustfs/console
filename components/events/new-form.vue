<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    :title="t('Subscribe to event notification') + ` (${t('Bucket')}: ${bucketName})`"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-card>
      <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="140px">
        <n-form-item :label="t('Amazon Resource Name')" path="resourceName">
          <n-select
            v-model:value="formData.resourceName"
            filterable
            :options="arnList"
            :placeholder="t('Please select resource name')"
          />
        </n-form-item>

        <n-form-item :label="t('Prefix')">
          <n-input v-model:value="formData.prefix" :placeholder="t('Please enter prefix')" />
        </n-form-item>

        <n-form-item :label="t('Suffix')">
          <n-input v-model:value="formData.suffix" :placeholder="t('Please enter suffix')" />
        </n-form-item>

        <n-form-item :label="t('Select events')" path="events">
          <n-scrollbar class="w-full max-h-64">
            <n-checkbox-group v-model:value="formData.events" class="flex flex-col">
              <n-checkbox class="mt-2" value="PUT" :label="t('PUT - Object upload')" />
              <n-checkbox class="mt-2" value="GET" :label="t('GET - Object access')" />
              <n-checkbox class="mt-2" value="DELETE" :label="t('DELETE - Object deletion')" />
              <n-checkbox class="mt-2" value="REPLICA" :label="t('REPLICA - Object migration')" />
              <n-checkbox class="mt-2" value="RESTORE" :label="t('ILM - Object converted')" />
              <n-checkbox
                class="mt-2"
                value="SCANNER"
                :label="t('SCANNER - Object has too many versions/prefix has too many subfolders')"
              />
            </n-checkbox-group>
          </n-scrollbar>
        </n-form-item>

        <n-space justify="center">
          <n-button @click="handleCancel">{{ t('Cancel') }}</n-button>
          <n-button type="primary" @click="handleSubmit">{{ t('Save') }}</n-button>
        </n-space>
      </n-form>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import type { FormItemRule, FormInst } from 'naive-ui';
import { NButton, NForm, NFormItem, NInput } from 'naive-ui';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { getEventTargetArnList } = useEventTarget();
const { putBucketNotifications, listBucketNotifications } = useBucket({});
const { t } = useI18n();
const formRef = ref<FormInst | null>(null);
const $message = useMessage();
interface FormData {
  resourceName: string;
  prefix: string;
  suffix: string;
  events: string[];
}

const formData = ref<FormData>({
  resourceName: '',
  prefix: '',
  suffix: '',
  events: [],
});

// 表单验证规则
const rules = {
  resourceName: [{ required: true, message: t('Please select resource name'), trigger: ['change', 'blur'] }],
  events: [
    {
      required: true,
      message: t('Please select at least one event'),
      trigger: ['change', 'blur'],
      validator: (rule: any, value: string[]) => {
        console.log('🚀 ~ value:', value);
        if (!value || value.length === 0) {
          return new Error(t('Please select at least one event'));
        }
        return true;
      },
    },
  ],
};

const props = defineProps({
  bucketName: {
    type: String,
    required: true,
  },
});

const emit = defineEmits<{
  success: [];
}>();

const visible = ref(false);
const open = () => {
  visible.value = true;
};

defineExpose({
  open,
});
const handleSubmit = async () => {
  try {
    // 进行表单验证
    await formRef.value?.validate();

    // 事件类型映射：将简化的值映射到 S3 标准事件集合
    const eventMapping: Record<string, string[]> = {
      PUT: ['s3:0bjectCreated:*'],
      GET: ['s3:0bjectAccessed:*'],
      DELETE: ['s3:0bjectRemoved:*'],
      REPLICA: ['s3:Replication:*'],
      RESTORE: ['s3:ObjectRestore:*', 's3:0bjectTransition:*'],
      SCANNER: ['s3:Scanner:ManyVersions', 's3:Scanner:BigPrefix'],
    };

    // 将选中的简化事件转换为 S3 标准事件集合
    const s3Events: string[] = [];
    formData.value.events.forEach(event => {
      if (eventMapping[event]) {
        s3Events.push(...eventMapping[event]);
      } else {
        // 如果不是预定义的事件，直接使用原值
        s3Events.push(event);
      }
    });

    // 去重，避免重复的事件
    const uniqueS3Events = [...new Set(s3Events)];

    // 验证转换后的事件列表
    if (uniqueS3Events.length === 0) {
      $message.error(t('No valid events found after conversion'));
      return;
    }

    // 先获取当前的通知配置
    let currentNotifications: any = {};
    try {
      const currentResponse = await listBucketNotifications(props.bucketName);
      // AWS SDK 返回的数据结构可能不同，需要检查实际返回的字段
      currentNotifications = currentResponse || {};
    } catch (error: any) {
      // 如果获取失败，使用空配置
      console.warn('获取当前通知配置失败，将使用空配置:', error);
      currentNotifications = {};
    }

    // 根据 ARN 类型构建通知配置
    const arn = formData.value.resourceName;
    const newNotificationConfig: {
      LambdaFunctionConfigurations?: any[];
      QueueConfigurations?: any[];
      TopicConfigurations?: any[];
    } = {};

    // 创建基础配置对象
    const baseConfig: {
      Id: string;
      Events: string[];
      Filter?: {
        Key: {
          FilterRules: Array<{ Name: string; Value: string }>;
        };
      };
    } = {
      Id: `notification-${Date.now()}`, // 生成唯一ID
      Events: uniqueS3Events, // 使用转换后去重的 S3 标准事件
      Filter: {
        Key: {
          FilterRules: [],
        },
      },
    };

    // 添加前缀和后缀过滤规则
    if (formData.value.prefix) {
      baseConfig.Filter!.Key.FilterRules.push({
        Name: 'Prefix',
        Value: formData.value.prefix,
      });
    }

    if (formData.value.suffix) {
      baseConfig.Filter!.Key.FilterRules.push({
        Name: 'Suffix',
        Value: formData.value.suffix,
      });
    }

    // 如果没有过滤规则，移除 Filter 对象
    if (baseConfig.Filter!.Key.FilterRules.length === 0) {
      delete baseConfig.Filter;
    }

    // 根据 ARN 类型确定配置类型
    if (arn.includes(':lambda:')) {
      // Lambda 函数配置
      newNotificationConfig.LambdaFunctionConfigurations = [
        {
          ...baseConfig,
          LambdaFunctionArn: arn,
        },
      ];
    } else if (arn.includes(':sqs:')) {
      // SQS 队列配置
      newNotificationConfig.QueueConfigurations = [
        {
          ...baseConfig,
          QueueArn: arn,
        },
      ];
    } else if (arn.includes(':sns:')) {
      // SNS 主题配置
      newNotificationConfig.TopicConfigurations = [
        {
          ...baseConfig,
          TopicArn: arn,
        },
      ];
    } else {
      // 默认使用 TopicConfigurations（适用于自定义事件目标）
      newNotificationConfig.TopicConfigurations = [
        {
          ...baseConfig,
          TopicArn: arn,
        },
      ];
    }

    // 合并当前配置和新配置
    const mergedNotificationConfig = {
      ...currentNotifications,
      ...newNotificationConfig,
    };

    // 合并数组类型的配置
    if (newNotificationConfig.LambdaFunctionConfigurations) {
      mergedNotificationConfig.LambdaFunctionConfigurations = [
        ...(currentNotifications.LambdaFunctionConfigurations || []),
        ...newNotificationConfig.LambdaFunctionConfigurations,
      ];
    }
    if (newNotificationConfig.QueueConfigurations) {
      mergedNotificationConfig.QueueConfigurations = [
        ...(currentNotifications.QueueConfigurations || []),
        ...newNotificationConfig.QueueConfigurations,
      ];
    }
    if (newNotificationConfig.TopicConfigurations) {
      mergedNotificationConfig.TopicConfigurations = [
        ...(currentNotifications.TopicConfigurations || []),
        ...newNotificationConfig.TopicConfigurations,
      ];
    }

    // 调用 API 创建 bucket notification
    await putBucketNotifications(props.bucketName, mergedNotificationConfig);

    $message.success(t('Create Success'));
    visible.value = false;

    // 重置表单
    formData.value = {
      resourceName: '',
      prefix: '',
      suffix: '',
      events: [],
    };

    // 触发成功事件，通知父组件刷新列表
    emit('success');
  } catch (error: any) {
    console.error('创建 bucket notification 失败:', error);
    $message.error(t('Create Failed'));
  }
};

const handleCancel = () => {
  // 取消逻辑
  visible.value = false;
  // 重置表单验证状态
  formRef.value?.restoreValidation();
};

// 获取arn列表
const arnList = ref<Array<{ label: string; value: string }>>([]);
getEventTargetArnList().then((res: string[]) => {
  arnList.value = res.map((item: string) => {
    return {
      label: item,
      value: item,
    };
  });
});
</script>
