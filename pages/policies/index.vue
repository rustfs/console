<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">IAM 策略</h1>
      </template>
      <template #actions>
        <n-button @click="handleNew">
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
        <!-- <div class="flex items-center gap-4">
          <n-button @click="() => refresh()">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>刷新</span>
          </n-button>
        </div> -->
      </div>
      <n-data-table
        ref="tableRef"
        class="border dark:border-neutral-700 rounded overflow-hidden"
        :columns="columns"
        :data="pilicies"
        :pagination="false"
        :bordered="false" />
    </page-content>
    <policies-form-item v-model:show="showPolicyForm" :policy="current" @saved="fetchPolicies" />
  </div>
</template>
<script lang="ts" setup>
import { Icon } from "#components";
import { type DataTableColumns, type DataTableInst, NButton, NPopconfirm, NSpace } from "naive-ui";
import { useNuxtApp } from "nuxt/app";
const { $api } = useNuxtApp();
const message = useMessage();

const pilicies = ref<any[]>([]);
const tableRef = ref<DataTableInst>();
const current = ref();
const showPolicyForm = computed({
  get: () => !!current.value,
  set: (val) => {
    if (!val) current.value = null;
  },
});

const handleEdit = (item: any) => {
  current.value = item;
};

const handleNew = () => {
  current.value = {
    name: "",
    content: "{}",
  };
};

interface RowData {
  name: string;
  content: string;
}

const columns: DataTableColumns<RowData> = [
  {
    title: "名称",
    key: "name",
    filter(value, row) {
      return !!row.name.includes(value.toString());
    },
  },

  {
    title: "操作",
    key: "actions",
    align: "center",
    width: 180,
    render: (row: any) => {
      return h(
        NSpace,
        {
          justify: "center",
        },
        {
          default: () => [
            h(
              NButton,
              {
                size: "small",
                secondary: true,
                onClick: () => handleEdit(row),
              },
              {
                default: () => "",
                icon: () => h(Icon, { name: "ri:edit-2-line" }),
              }
            ),
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
          ],
        }
      );
    },
  },
];

function filterName(value: string) {
  tableRef.value &&
    tableRef.value.filter({
      name: [value],
    });
}

const fetchPolicies = async () => {
  try {
    const res = await $api.get("/list-canned-policies");
    pilicies.value = Object.keys(res).map((key) => {
      return {
        name: key,
        content: res[key],
      };
    });
  } catch (error) {
    message.error("获取数据失败");
  }
};

onMounted(() => {
  fetchPolicies();
});

const refresh = () => {
  fetchPolicies();
};

async function deleteItem(row: any) {
  try {
    await $api.delete(`/remove-canned-policy?name=${encodeURIComponent(row.name)}`);
    message.success("删除成功");
    fetchPolicies();
  } catch (error) {
    message.error("删除失败");
  }
}
</script>
<style lang="scss" scoped></style>
