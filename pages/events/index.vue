<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Events') }}</h1>
      </template>
    </page-header>
    <page-content class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div style="width: 300px">
          <n-form-item :label="t('Bucket')" path="" class="flex-auto" label-placement="left">
            <n-select
              filterable
              v-model:value="bucketName"
              :placeholder="t('Please select bucket')"
              :options="bucketList"
            />
          </n-form-item>
        </div>

        <div class="flex items-center gap-4">
          <n-button @click="() => handleNew()">
            <Icon name="ri:add-line" class="mr-2" />
            <span>{{ t('Add Event Subscription') }}</span>
          </n-button>
          <n-button @click="refresh">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>{{ t('Refresh') }}</span>
          </n-button>
        </div>
      </div>

      <n-data-table
        v-if="pageData.length > 0"
        class="border dark:border-neutral-700 rounded overflow-hidden"
        :columns="columns"
        :data="pageData"
        :pagination="false"
        :bordered="false"
        :loading="loading"
      />
      <n-card v-else class="flex flex-center" style="height: 400px">
        <n-empty :description="t('No Data')"></n-empty>
      </n-card>
      <events-new-form ref="newRef" :bucketName="bucketName" @success="refresh"></events-new-form>
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components';
import { NButton, NSpace, NTag, type DataTableColumns } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { listBuckets, listBucketNotifications, putBucketNotifications } = useBucket({});
const dialog = useDialog();
const message = useMessage();

interface NotificationItem {
  id: string;
  type: 'Lambda' | 'SQS' | 'SNS' | 'Topic';
  arn: string;
  events: string[];
  prefix?: string;
  suffix?: string;
  filterRules?: Array<{ Name: string; Value: string }>;
}

// 事件映射：将 S3 标准事件映射回简化的显示名称
const eventDisplayMapping: Record<string, string> = {
  // PUT 相关事件
  's3:0bjectCreated:*': 'PUT',

  // GET 相关事件
  's3:0bjectAccessed:*': 'GET',

  // DELETE 相关事件
  's3:0bjectRemoved:*': 'DELETE',

  // REPLICA 相关事件
  's3:Replication:*': 'REPLICA',

  // RESTORE 相关事件
  's3:ObjectRestore:*': 'RESTORE',
  's3:0bjectTransition:*': 'RESTORE',

  // SCANNER 相关事件
  's3:Scanner:ManyVersions': 'SCANNER',
  's3:Scanner:BigPrefix': 'SCANNER',
};

// 将 S3 事件转换为显示名称
const getEventDisplayName = (s3Event: string): string => {
  return eventDisplayMapping[s3Event] || s3Event;
};

const columns: DataTableColumns<NotificationItem> = [
  {
    title: t('Type'),
    key: 'type',
    width: 100,
    render: (row: NotificationItem) => {
      const typeColors = {
        Lambda: 'warning',
        SQS: 'primary',
        SNS: 'success',
        Topic: 'info',
      };
      return h(
        NTag,
        {
          type: typeColors[row.type] as any,
          size: 'small',
        },
        { default: () => row.type }
      );
    },
  },
  {
    title: t('ARN'),
    key: 'arn',
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: t('Events'),
    key: 'events',
    width: 200,
    render: (row: NotificationItem) => {
      // 将 S3 事件转换为显示名称并去重
      const displayEvents = [...new Set(row.events.map(getEventDisplayName))];

      return h(
        'div',
        { class: 'flex flex-wrap gap-1' },
        displayEvents.map(event => h('n-tag', { size: 'tiny', type: 'info' }, { default: () => event }))
      );
    },
  },
  {
    title: t('Prefix'),
    key: 'prefix',
    width: 120,
    render: (row: NotificationItem) => row.prefix || '-',
  },
  {
    title: t('Suffix'),
    key: 'suffix',
    width: 120,
    render: (row: NotificationItem) => row.suffix || '-',
  },
  {
    title: t('Actions'),
    key: 'actions',
    align: 'center',
    width: 100,
    render: (row: NotificationItem) => {
      return h(
        NSpace,
        {
          justify: 'center',
        },
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                secondary: true,
                onClick: e => handleRowDelete(row, e),
              },
              {
                default: () => '',
                icon: () => h(Icon, { name: 'ri:delete-bin-7-line' }),
              }
            ),
          ],
        }
      );
    },
  },
];

// 获取桶列表
const { data } = await useAsyncData(
  'buckets',
  async () => {
    const response = await listBuckets();
    return (
      response.Buckets?.sort((a: any, b: any) => {
        return a.Name.localeCompare(b.Name);
      }) || []
    );
  },
  { default: () => [] }
);

const bucketList = computed(() => {
  return data.value.map(bucket => ({
    label: bucket.Name,
    value: bucket.Name,
  }));
});

const bucketName = ref<string>(bucketList.value.length > 0 ? (bucketList.value[0]?.value ?? '') : '');

const pageData = ref([]);
const bucketName = ref<string>(bucketList.value.length > 0 ? (bucketList.value[0]?.value ?? '') : '');
const loading = ref<boolean>(false);
const pageData = ref<NotificationItem[]>([]);
watch(
  () => bucketName.value,
  async newVal => {
    if (!newVal) return;

    loading.value = true;
    try {
      refresh();
    } catch (error) {
      pageData.value = [];
    } finally {
      loading.value = false;
    }
  },
  { immediate: true }
);

const handleRowDelete = async (row: NotificationItem, e: Event) => {
  e.stopPropagation();

  // 显示确认对话框
  const confirmed = await new Promise<boolean>(resolve => {
    dialog.warning({
      title: t('Confirm Delete'),
      content: t('Are you sure you want to delete this notification configuration?'),
      positiveText: t('Delete'),
      negativeText: t('Cancel'),
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
    });
  });

  if (!confirmed) return;

  try {
    loading.value = true;

    // 获取当前的通知配置
    const currentResponse = await listBucketNotifications(bucketName.value);
    const currentNotifications = currentResponse || {};

    // 根据类型从对应数组中移除配置
    let updatedConfigurations: any[] = [];

    if (row.type === 'Lambda' && currentNotifications.LambdaFunctionConfigurations) {
      updatedConfigurations = currentNotifications.LambdaFunctionConfigurations.filter(
        (config: any) => config.Id !== row.id
      );
    } else if (row.type === 'SQS' && currentNotifications.QueueConfigurations) {
      updatedConfigurations = currentNotifications.QueueConfigurations.filter((config: any) => config.Id !== row.id);
    } else if (row.type === 'SNS' && currentNotifications.TopicConfigurations) {
      updatedConfigurations = currentNotifications.TopicConfigurations.filter((config: any) => config.Id !== row.id);
    }

    // 构建新的通知配置
    const newNotificationConfig = {
      ...currentNotifications,
    };

    // 更新对应类型的配置数组
    if (row.type === 'Lambda') {
      newNotificationConfig.LambdaFunctionConfigurations = updatedConfigurations;
    } else if (row.type === 'SQS') {
      newNotificationConfig.QueueConfigurations = updatedConfigurations;
    } else if (row.type === 'SNS') {
      newNotificationConfig.TopicConfigurations = updatedConfigurations;
    }

    // 提交更新后的配置
    await putBucketNotifications(bucketName.value, newNotificationConfig);

    // 显示成功消息
    message.success(t('Delete Success'));

    // 刷新列表
    await refresh();
  } catch (error: any) {
    console.error('删除通知配置失败:', error);
    message.error(t('Delete Failed') + ': ' + (error.message || error));
  } finally {
    loading.value = false;
  }
};

const newRef = ref();
const handleNew = () => {
  newRef.value.open();
};
  newRef.value.open();
};

const refresh = async () => {
  if (!bucketName.value) {
    pageData.value = [];
    return;
  }

  try {
    const response = await listBucketNotifications(bucketName.value);
    const notifications: NotificationItem[] = [];

    // 处理 Lambda 函数配置
    if (response.LambdaFunctionConfigurations) {
      response.LambdaFunctionConfigurations.forEach((config: any) => {
        const prefix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Prefix')?.Value;
        const suffix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Suffix')?.Value;

        notifications.push({
          id: config.Id,
          type: 'Lambda',
          arn: config.LambdaFunctionArn,
          events: config.Events || [],
          prefix,
          suffix,
          filterRules: config.Filter?.Key?.FilterRules || [],
        });
      });
    }

    // 处理 SQS 队列配置
    if (response.QueueConfigurations) {
      response.QueueConfigurations.forEach((config: any) => {
        const prefix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Prefix')?.Value;
        const suffix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Suffix')?.Value;

        notifications.push({
          id: config.Id,
          type: 'SQS',
          arn: config.QueueArn,
          events: config.Events || [],
          prefix,
          suffix,
          filterRules: config.Filter?.Key?.FilterRules || [],
        });
      });
    }

    // 处理 SNS 主题配置
    if (response.TopicConfigurations) {
      response.TopicConfigurations.forEach((config: any) => {
        const prefix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Prefix')?.Value;
        const suffix = config.Filter?.Key?.FilterRules?.find((rule: any) => rule.Name === 'Suffix')?.Value;

        notifications.push({
          id: config.Id,
          type: 'SNS',
          arn: config.TopicArn,
          events: config.Events || [],
          prefix,
          suffix,
          filterRules: config.Filter?.Key?.FilterRules || [],
        });
      });
    }

    pageData.value = notifications;
  } catch (error) {
    console.error('获取通知配置失败:', error);
    pageData.value = [];
  }
};
</script>
