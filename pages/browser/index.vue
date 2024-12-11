<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">对象浏览器</h1>
      </template>
      <template #actions>
        <n-button>
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
          <n-button @click="() => refresh()">
            <Icon name="ri:refresh-line" class="mr-2" />
            <span>刷新</span>
          </n-button>
        </div>
      </div>
      <n-data-table class="border dark:border-neutral-700 rounded overflow-hidden" :columns="columns" :data="data" :pagination="false" :bordered="false" />
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { NuxtLink } from "#components"
import { ListBucketsCommand } from "@aws-sdk/client-s3"

const { $s3Client } = useNuxtApp();

const columns = [
  {
    title: '桶',
    dataIndex: 'name',
    key: 'Name',
    render: (row: { Name: string }) => {
      return h(NuxtLink, { href: `/browser/${encodeURIComponent(row.Name)}`, class: 'flex items-center gap-2' }, [icon('ri:archive-line'), row.Name]);
    }
  },
  { title: '创建时间', dataIndex: 'creationDate', key: 'CreationDate' },
]

const { data, refresh } = await useAsyncData('buckets', async () => {
  const response = await $s3Client.send(new ListBucketsCommand({}));
  return response.Buckets || [];
}, { default: () => [] });
</script>
