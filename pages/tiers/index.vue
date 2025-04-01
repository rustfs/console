<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">分层</h1>
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
          <n-button @click="() => addForm()">
            <Icon name="ri:add-line" class="mr-2" />
            <span>添加分层</span>
          </n-button>
          <n-button @click="async () => refresh()">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>刷新</span>
          </n-button>
        </div>
      </div>
      <n-data-table class="border dark:border-neutral-700 rounded overflow-hidden" :columns="columns" :data="filteredData" :pagination="false" :bordered="false" />
      <tiers-new-form ref='newFormRef'></tiers-new-form>
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import dayjs from 'dayjs'
import { NButton, NSpace, type DataTableColumns ,NPopconfirm} from 'naive-ui'

const searchTerm = ref('');

interface RowData {
  Name: string;
  CreationDate: string;
}

const columns: DataTableColumns<RowData> = [
  {
    title: '分层类型',
    // dataIndex: 'name',
    key: 'Name',
  },
  {
    title: 'Endpoint',
    // dataIndex: 'name',
    key: 'Endpoint',
  },
  {
    title: '存储空间',
    // dataIndex: 'name',
    key: 'Bucket',
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
  'tiers',
  async () => {
    // const response = await listBuckets();
    // return response
    return []
  },
  { default: () => [] }
);

const filteredData = computed(() => {
  if (!searchTerm.value) {
    return data.value;
  }

  const term = searchTerm.value.toLowerCase();
  return data.value.filter(bucket =>
    bucket
  );
});

const infoRef = ref();
const handleRowClick = (row: RowData,e: Event) => {
  e.stopPropagation();
  infoRef.value.openDrawer(row.Name);
};

const message = useMessage();
const deleteItem = async (row: RowData) => {

  //  delete(row.Name).then(()=>{
  //   message.success("删除成功")
  //      refresh();

  // }).catch((error)=>{
  //   message.error("删除失败")
  // })
 
};

const newFormRef = ref();
const addForm = async () => {
  newFormRef.value.open();
};

</script>
