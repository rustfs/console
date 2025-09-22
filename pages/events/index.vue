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
          <n-button @click="">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>{{ t('Refresh') }}</span>
          </n-button>
        </div>
      </div>

      <n-card class="flex flex-center" style="height: 400px">
        <n-empty :description="t('No Data')"></n-empty>
      </n-card>
      <!-- <n-data-table class="border dark:border-neutral-700 rounded overflow-hidden" :columns="columns" :data="pageData" :pagination="false" :bordered="false" /> -->
      <events-new-form ref="newRef" :bucketName="bucketName"></events-new-form>
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components';
import { NButton, NSpace, type DataTableColumns } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { listBuckets } = useBucket({});
const formVisible = ref(false);
const searchTerm = ref('');

interface RowData {
  Name: string;
  CreationDate: string;
}

const columns: DataTableColumns<RowData> = [
  {
    title: t('Type'),
    key: '',
  },
  {
    title: t('Version'),
    key: '',
  },
  {
    title: t('Expiration Delete Mark'),
    key: '',
  },
  {
    title: t('Tier'),
    key: '',
  },
  {
    title: t('Prefix'),
    key: '',
  },
  {
    title: t('Time'),
    key: '',
  },
  {
    title: t('Status'),
    key: '',
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

const handleRowDelete = (row: RowData, e: Event) => {
  e.stopPropagation();
  console.log(row);
};

const newRef = ref();
const handleNew = () => {
  newRef.value.open();
};
</script>
