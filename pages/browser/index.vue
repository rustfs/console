<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">Browser</h1>
      </template>
      <template #actions>
        <button class="btn">Create Bucket</button>
      </template>
    </page-header>
    <page-content class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center justify-between">
          <n-input placeholder="Search buckets">
            <template #prefix>
              <Icon name="ri:search-2-line" />
            </template>
          </n-input>
        </div>
        <div class="flex items-center gap-4">
          <n-button>Refresh</n-button>
        </div>
      </div>
      <n-data-table :columns="columns" :data="data" :pagination="false" :bordered="false" />
    </page-content>
  </div>
</template>

<script lang="ts" setup>
const { $s3Client } = useNuxtApp();

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'Name',
    render: (row: { Name: string }) => {
      return h('a', { href: `/browser/${row.Name}/` }, row.Name);
    }
  },
  { title: 'Creation Date', dataIndex: 'creationDate', key: 'CreationDate' },
]

import { ListBucketsCommand } from "@aws-sdk/client-s3"

const response = await $s3Client.send(new ListBucketsCommand({}));
const data = response.Buckets;
</script>
