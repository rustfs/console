<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Bucket Replication') }}</h1>
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
          <n-button @click="() => openForm()">
            <Icon name="ri:add-line" class="mr-2" />
            <span>{{ t('Add Replication Rule') }}</span>
          </n-button>
          <n-button @click="loadReplication">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>{{ t('Refresh') }}</span>
          </n-button>
        </div>
      </div>

      <n-data-table
        class="border dark:border-neutral-700 rounded overflow-hidden"
        :columns="columns"
        :data="pageData"
        :pagination="false"
        :bordered="false"
        v-if="pageData.length > 0"
      />
      <n-card class="flex flex-center" style="height: 400px" v-else>
        <n-empty :description="t('No Data')"></n-empty>
      </n-card>
      <replication-new-form :bucketName="bucketName" ref="addFromRef" @success="onAddSuccess"></replication-new-form>
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components';
import { NButton, NSpace, type DataTableColumns } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useBucket } from '@/composables/useBucket';
import { h, ref, computed, watch } from 'vue';
import { useMessage } from 'naive-ui';

const { t } = useI18n();
const {
  listBuckets,
  getBucketReplication,
  putBucketReplication,
  deleteBucketReplication,
  deleteRemoteReplicationTarget,
} = useBucket({});
const formVisible = ref(false);
const searchTerm = ref('');
const message = useMessage();

interface RowData {
  Name: string;
  CreationDate: string;
}

const columns: DataTableColumns<ReplicationRule> = [
  {
    title: t('Rule ID'),
    key: 'ID',
    align: 'center',
  },
  {
    title: t('Status'),
    key: 'Status',
    align: 'center',
    render: row => (row.Status === 'Enabled' ? t('Enabled') : t('Disabled')),
  },
  {
    title: t('Priority'),
    key: 'Priority',
    align: 'center',
  },
  {
    title: t('Prefix'),
    key: 'Filter',
    align: 'center',
    render: row => row.Filter?.Prefix || '-',
  },
  {
    title: t('Destination Bucket'),
    key: 'Destination',
    align: 'center',
    render: row => {
      // MinIO/标准S3结构：arn:aws:s3:::bucketname
      const bucketArn = row.Destination?.Bucket || '';
      return bucketArn.replace(/^arn:aws:s3:::/, '');
    },
  },
  {
    title: t('Storage Class'),
    key: 'Destination',
    align: 'center',
    render: row => row.Destination?.StorageClass || '-',
  },
  {
    title: t('Actions'),
    key: 'actions',
    align: 'center',
    width: 100,
    render: row => {
      return h(
        NSpace,
        { justify: 'center' },
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

// 复制规则类型
interface ReplicationRule {
  [key: string]: any;
}
const pageData = ref<ReplicationRule[]>([]);

// 加载复制规则
const loadReplication = async () => {
  if (!bucketName.value) {
    pageData.value = [];
    return;
  }
  try {
    const res = await getBucketReplication(bucketName.value);
    if (!res) {
      pageData.value = [];
      return;
    }

    // 兼容无规则时返回空对象
    pageData.value = res?.ReplicationConfiguration?.Rules || [];
  } catch (e) {
    pageData.value = [];
  }
};

// 监听 bucketName 变化自动加载
watch(
  bucketName,
  () => {
    loadReplication();
  },
  { immediate: true }
);

// 删除规则
const handleRowDelete = async (row: any, e: Event) => {
  e.stopPropagation();
  try {
    // 1. 获取当前所有规则
    const res: any = await getBucketReplication(bucketName.value);
    let rules = res?.ReplicationConfiguration?.Rules || [];
    const arn: string = res?.ReplicationConfiguration?.Role || ''; // 例如 arn:aws:s3:::bucketname
    console.log(arn);

    // 2. 过滤掉要删除的规则
    const newRules = rules.filter((r: any) => r.ID !== row.ID);
    if (newRules.length === 0) {
      // 如果删除后没有规则，直接删除整个配置
      await deleteBucketReplication(bucketName.value);
    } else {
      // 否则 put 新规则集
      await putBucketReplication(bucketName.value, {
        Role: res?.ReplicationConfiguration?.Role,
        Rules: newRules,
      });
      // 4. 删除远程目标
      if (arn) {
        deleteRemoteReplicationTarget(bucketName.value, arn);
      }
    }

    message.success(t('Delete success'));
    loadReplication();
  } catch (err) {
    message.error(t('Delete failed'));
  }
};

const addFromRef = ref();
const openForm = () => {
  addFromRef.value.open();
};

// 新增成功后刷新
const onAddSuccess = () => {
  loadReplication();
};
</script>
