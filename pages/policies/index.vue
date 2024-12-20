<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">IAM 策略</h1>
      </template>
      <template #actions>
        <n-button @click="addItem">
          <Icon name="ri:add-line" class="mr-2" />
          <span>创建策略</span>
        </n-button>
      </template>
    </page-header>
    <page-content class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center justify-between">
          <n-input placeholder="搜索" @input="filterName">
            <template #prefix>
              <Icon name="ri:search-2-line" />
            </template>
          </n-input>
        </div>
        <div class="flex items-center gap-4">
          <n-button @click="() => refresh()">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>刷新</span>
          </n-button>
        </div>
      </div>
      <n-data-table
        ref="tableRef"
        class="border dark:border-neutral-700 rounded overflow-hidden"
        :columns="columns"
        :data="listData"
        :pagination="false"
        :bordered="false" />
    </page-content>
    <NewItem ref="newItemRef" v-model:visible="newItemVisible" @search="getDataList" />
    <EditItem ref="editItemRef" @search="getDataList" />
  </div>
</template>
<script lang="ts" setup>
import { useNuxtApp } from 'nuxt/app';
import { EditItem, NewItem } from '~/components/policies';
import { type DataTableColumns, type DataTableInst, NButton, NPopconfirm, NSpace } from 'naive-ui';
import { Icon } from '#components';
const { $api } = useNuxtApp();
const message = useMessage();

interface RowData {
  name: string;
}
const columns: DataTableColumns<RowData> = [
  {
    title: '名称',
    key: 'name',
    filter(value, row) {
      return !!row.name.includes(value.toString());
    },
  },

  {
    title: '操作',
    key: 'actions',
    align: 'center',
    width: 180,
    render: (row: any) => {
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
                onClick: () => openEditItem(row),
              },
              {
                default: () => '',
                icon: () => h(Icon, { name: 'ri:edit-2-line' }),
              }
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => deleteItem(row) },
              {
                default: () => '确认删除',
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

/*************************************搜索过滤***/

const tableRef = ref<DataTableInst>();
function filterName(value: string) {
  tableRef.value &&
    tableRef.value.filter({
      name: [value],
    });
}

/*************************************获取数据***/
const listData = ref<any[]>([]);
const getDataList = async () => {
  try {
    const res = await $api.get('policies');
    listData.value = res.policies || [];
  } catch (error) {
    message.error('获取数据失败');
  }
};

onMounted(() => {
  getDataList();
});
/*************************************刷新***/
const refresh = () => {};

/*************************************新增***/
const newItemRef = ref();
const newItemVisible = ref(false);

function addItem() {
  newItemVisible.value = true;
}

/** **********************************修改 */
const editItemRef = ref();
function openEditItem(row: any) {
  editItemRef.value.openDialog(row);
}
/*************************************删除***/
async function deleteItem(row: any) {
  try {
    const res = await $api.delete(`/policy/${encodeURIComponent(row.name)}`);
    message.success('删除成功');
    getDataList();
  } catch (error) {
    message.error('删除失败');
  }
}
</script>
<style lang="scss" scoped></style>
