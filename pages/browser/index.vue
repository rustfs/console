<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">桶</h1>
      </template>
      <template #actions>
        <n-button @click="() => (formVisible = true)">
          <Icon name="ri:add-line" class="mr-2" />
          <span>创建桶</span>
        </n-button>
      </template>
    </page-header>
    <page-content class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center justify-between">
          <n-input placeholder="搜索">
            <template #prefix>
              <Icon name="ri:search-2-line" />
            </template>
          </n-input>
        </div>
        <div class="flex items-center gap-4">
          <n-button @click="async () => refresh()">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>刷新</span>
          </n-button>
        </div>
      </div>
      <n-data-table class="border dark:border-neutral-700 rounded overflow-hidden" :columns="columns" :data="data" :pagination="false" :bordered="false" />
    </page-content>

    <buckets-new-form :show="formVisible" @update:show="handleFormClosed"></buckets-new-form>
  </div>
</template>

<script lang="ts" setup>
import { Icon, NuxtLink } from '#components'
import { NButton, NSpace, type DataTableColumns } from 'naive-ui'
import { useRouter } from 'vue-router'

const { listBuckets } = useBucket({});
const formVisible = ref(false);

interface RowData {
  Name: string;
  creationDate: string;
}
const columns: DataTableColumns<RowData> = [
  {
    title: '桶',
    // dataIndex: 'name',
    key: 'Name',
    render: (row: { Name: string }) => {
      return h(
        NuxtLink,
        {
          href: `/browser/${encodeURIComponent(row.Name)}`,
          class: 'flex items-center gap-2',
        },
        {
          default: () => [icon('ri:archive-line'), row.Name]
        }
      );
    },
  },
  {
    title: '创建时间',
    // dataIndex: 'creationDate',
    key: 'CreationDate',
  },
  {
    title: '操作',
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
                onClick: () => handleRowClick(row),
              },
              {
                default: () => '',
                icon: () => h(Icon, { name: 'ri:settings-5-line' }),
              }
            ),
          ],
        }
      );
    },
  },
];

const { data, refresh } = await useAsyncData(
  'buckets',
  async () => {
    const response = await listBuckets();
    return response.Buckets || [];
  },
  { default: () => [] }
);

const router = useRouter();
const handleRowClick = (row: RowData) => {
  router.push({
    path: `/bucket/${encodeURIComponent(row.Name)}`,
  });
};
const handleFormClosed = (show: boolean) => {
  formVisible.value = show;
  refresh();
};
</script>
