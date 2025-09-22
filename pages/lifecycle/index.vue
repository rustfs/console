<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Lifecycle') }}</h1>
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
            <span>{{ t('Add Lifecycle Rule') }}</span>
          </n-button>
          <n-button @click="refresh">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>{{ t('Refresh') }}</span>
          </n-button>
        </div>
      </div>

      <n-data-table
        class="border dark:border-neutral-700 rounded overflow-hidden"
        v-if="pageData.length > 0"
        :columns="columns"
        :data="pageData"
        :pagination="false"
        :bordered="false"
      />

      <n-card class="flex flex-center" style="height: 400px" v-else>
        <n-empty :description="t('No Data')"></n-empty>
      </n-card>
      <!-- <n-data-table class="border dark:border-neutral-700 rounded overflow-hidden" :columns="columns" :data="pageData" :pagination="false" :bordered="false" /> -->
      <lifecycle-new-form ref="newRef" :bucketName="bucketName" @search="refresh"></lifecycle-new-form>
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components';
import { NButton, NSpace, NPopconfirm, type DataTableColumns } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const message = useMessage();
const { listBuckets, getBucketLifecycleConfiguration, deleteBucketLifecycle, putBucketLifecycleConfiguration } =
  useBucket({});
const formVisible = ref(false);

interface RowData {
  Status?: string;
  ID?: string;
  NoncurrentVersionExpiration?: {
    NoncurrentDays?: number;
  };
  Expiration?: {
    StorageClass?: string;
    Days?: number;
    Date?: string;
    ExpiredObjectDeleteMarker?: boolean;
  };
  Filter?: {
    Prefix?: string;
  };
  Transitions?: {
    Days?: number;
    StorageClass?: string;
  }[];
}

const columns: DataTableColumns<RowData> = [
  {
    title: t('Type'),
    key: '',
    render: row => {
      return h(NSpace, {}, () => {
        console.log(row);
        if (row?.Transitions) {
          return t('Transition');
        } else {
          return t('Expire');
        }
      });
    },
  },
  {
    title: t('Version'),
    key: 'Transition',
    render: row => {
      return h(NSpace, {}, row?.NoncurrentVersionExpiration ? t('Non-current Version') : t('Current Version'));
    },
  },
  {
    title: t('Expiration Delete Mark'),
    key: '',
    render: row => {
      return h(NSpace, {}, row?.Expiration?.ExpiredObjectDeleteMarker ? t('On') : t('Off'));
    },
  },
  {
    title: t('Tier'),
    key: '',
    render: row => {
      return h(NSpace, {}, row?.Transitions?.[0]?.StorageClass || '--');
    },
  },
  {
    title: t('Prefix'),
    key: 'Filter',
    render: row => {
      return h(NSpace, {}, row?.Filter?.Prefix || '');
    },
  },

  {
    title: t('Time Cycle') + '(' + t('Days') + ')',
    key: 'NoncurrentVersionExpiration',
    render: row => {
      return h(
        NSpace,
        {},
        row?.Expiration?.Days || row?.NoncurrentVersionExpiration?.NoncurrentDays || row?.Transitions?.[0]?.Days || ''
      );
    },
  },
  {
    title: t('Status'),
    key: 'Status',
  },
  {
    title: t('Actions'),
    key: 'actions',
    align: 'center',
    width: 100,
    render: (row: RowData) => {
      return h(
        NSpace,
        {
          justify: 'center',
        },
        {
          default: () => [
            h(
              NPopconfirm,
              { onPositiveClick: () => handleRowDelete(row) },
              {
                default: () => t('Confirm Delete'),
                trigger: () =>
                  h(
                    NButton,
                    { size: 'small', secondary: true },
                    {
                      default: () => '',
                      icon: () => h(Icon, { name: 'ri:delete-bin-5-line' }),
                    }
                  ),
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
const pageData = ref<any[]>([]);
const loading = ref<boolean>(false);
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

const handleRowDelete = (row: RowData) => {
  const params = pageData.value.filter(item => item.ID !== row.ID);
  console.log(params);
  if (params.length === 0) {
    deleteBucketLifecycle(bucketName.value).then(async res => {
      message.success(t('Delete Success'));
      refresh();
    });
  } else {
    putBucketLifecycleConfiguration(bucketName.value, { Rules: params })
      .then(async res => {
        message.success(t('Delete Success'));
        refresh();
      })
      .catch(e => {
        message.error(e.message);
      });
  }
};

const refresh = async () => {
  const response = await getBucketLifecycleConfiguration(bucketName.value);
  pageData.value = response.Rules?.sort((a: any, b: any) => a.ID.localeCompare(b.ID)) || [];
};

const newRef = ref();
const handleNew = () => {
  newRef.value.open();
};
</script>
