<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">桶</h1>
      </template>
    </page-header>
    <page-content class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center justify-between">
          <n-input v-model:value="searchTerm" placeholder="搜索">
            <template #prefix>
              <Icon name="ri:search-2-line" />
            </template>
          </n-input>
        </div>

        <div class="flex items-center gap-4">
          <n-button @click="() => (formVisible = true)">
            <Icon name="ri:add-line" class="mr-2" />
            <span>创建桶</span>
          </n-button>
          <n-button @click="async () => refresh()">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>刷新</span>
          </n-button>
        </div>
      </div>
      <n-data-table class="border dark:border-neutral-700 rounded overflow-hidden" :columns="columns" :data="filteredData" :pagination="false" :bordered="false" />
    </page-content>

    <buckets-new-form :show="formVisible" @update:show="handleFormClosed"></buckets-new-form>
    <buckets-info ref="infoRef"></buckets-info>
  </div>
</template>

<script lang="ts" setup>
import { Icon, NuxtLink } from '#components'
import dayjs from 'dayjs'
import { NButton, NSpace, type DataTableColumns ,NPopconfirm} from 'naive-ui'

const { listBuckets ,deleteBucket} = useBucket({});
const formVisible = ref(false);
const searchTerm = ref('');

interface RowData {
  Name: string;
  CreationDate: string;
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
    render: (row: RowData) => {
      return dayjs(row.CreationDate).format('YYYY-MM-DD HH:mm:ss');
    },
  },
  {
    title: '操作',
    key: 'actions',
    align: 'center',
    width: 140,
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
              { onPositiveClick: () => deleteItem(row) },
              {
                default: () => "确认删除",
                trigger: () =>
                  h(
                    NButton,
                    { size: "small", secondary: true },
                    {
                      default: () => "",
                      icon: () => h(Icon, { name: "ri:delete-bin-5-line" }),
                    }
                  ),
              }
            ),
            h(
              NButton,
              {
                size: 'small',
                secondary: true,
                onClick: (e) => handleRowClick(row,e),
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
    // sort by creation date
    // return response.Buckets?.sort((a:any, b:any) => {return new Date(b.CreationDate).getTime() -  new Date(a.CreationDate).getTime()  }) || [];
    // sort  by name
    return response.Buckets?.sort((a:any, b:any) => {return a.Name.localeCompare(b.Name)  }) || [];
  },
  { default: () => [] }
);

const filteredData = computed(() => {
  if (!searchTerm.value) {
    return data.value;
  }

  const term = searchTerm.value.toLowerCase();
  return data.value.filter(bucket =>
    bucket.Name?.toLowerCase().includes(term)
  );
});

const infoRef = ref();
const handleRowClick = (row: RowData,e: Event) => {
  e.stopPropagation();
  infoRef.value.openDrawer(row.Name);
};

const message = useMessage();
const deleteItem = async (row: RowData) => {
   deleteBucket(row.Name).then(()=>{
    message.success("删除成功")
       refresh();

  }).catch((error)=>{
    message.error("删除失败")
  })
 
};
const handleFormClosed = (show: boolean) => {
  formVisible.value = show;
  refresh();
};
</script>
