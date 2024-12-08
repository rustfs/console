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
    <page-content>
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 class="text-lg font-bold">Bucket 1</h2>
          <p class="text-sm text-gray-500">3 files</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 class="text-lg font-bold">Bucket 2</h2>
          <p class="text-sm text-gray-500">5 files</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 class="text-lg font-bold">Bucket 3</h2>
          <p class="text-sm text-gray-500">1 file</p>
        </div>
      </div>
    </page-content>
  </div>
</template>

<script lang="ts" setup>
// const { data: buckets, status, error } = await useAPI('/buckets')
// console.log(buckets, status, error);
</script>
