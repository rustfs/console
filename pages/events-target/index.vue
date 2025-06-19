<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t("Event Destinations") }}</h1>
      </template>
    </page-header>
    <page-content class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center justify-between">
          <n-input v-model:value="searchTerm" :placeholder="t('Search')">
            <template #prefix>
              <Icon name="ri:search-2-line" />
            </template>
          </n-input>
        </div>

        <div class="flex items-center gap-4">
          <n-button @click="() => addForm()">
            <Icon name="ri:add-line" class="mr-2" />
            <span>{{ t("Add Event Destination") }}</span>
          </n-button>
          <n-button @click="async () => refresh()">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>{{ t("Refresh") }}</span>
          </n-button>
        </div>
      </div>
      <n-data-table
        class="border dark:border-neutral-700 rounded overflow-hidden"
        :columns="columns"
        :data="filteredData"
        :pagination="false"
        :bordered="false" />
    </page-content>
    <events-target-new ref="newFormRef"></events-target-new>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "#components";
import { NButton, NSpace, type DataTableColumns, NPopconfirm } from "naive-ui";
import { useI18n } from "vue-i18n";
const message = useMessage();

const { t } = useI18n();
const searchTerm = ref("");

interface RowData {
  type: string;
}

const columns: DataTableColumns<RowData> = [
  {
    title: t("Status"),
    key: "bucket",
    width: 180,
  },
  {
    title: t("Service"),
    key: "endpoint",
  },

  {
    title: t("Actions"),
    key: "actions",
    align: "center",
    width: 140,
    render: (row: RowData) => {
      return h(
        NSpace,
        {
          justify: "center",
        },
        {
          default: () => [
            h(
              NPopconfirm,
              { onPositiveClick: () => deleteItem(row) },
              {
                default: () => t("Confirm Delete"),
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

const { data, refresh } = await useAsyncData(
  "tier",
  async () => {
    // const response = await usetier.listTiers();
    // return response;
    return [];
  },
  { default: () => [] }
);

const filteredData = computed(() => {
  if (!searchTerm.value) {
    return data.value;
  }

  const term = searchTerm.value.toLowerCase();
  return data.value.filter(
    (tier: any) =>
      tier.name.toLowerCase().includes(term) ||
      tier.endpoint.toLowerCase().includes(term) ||
      tier.bucket.toLowerCase().includes(term)
  );
});

const deleteItem = async (row: RowData) => {
  // usetier
  //   .removeTiers(config.name)
  //   .then(() => {
  //     message.success(t("Delete Success"));
  //     refresh();
  //   })
  //   .catch((error) => {
  //     message.error(t("Delete Failed"));
  //   });
};

const newFormRef = ref();
const addForm = async () => {
  newFormRef.value.open();
};
</script>

<style lang="scss" scoped></style>
