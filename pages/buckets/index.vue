<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">存储桶</h1>
      </template>
      <template #actions>
        <n-button @click="createBucket">
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
      <n-data-table
        class="border dark:border-neutral-700 rounded overflow-hidden"
        :columns="columns"
        :data="data"
        :pagination="false"
        :bordered="false" />
    </page-content>
    <!--  新建桶弹窗 -->
    <buckets-new-item @search="getDataList"></buckets-new-item>
  </div>
</template>

<script setup>
/****************************基本配置******************************/

// 获取同列表
const getDataList = () => {};
/****************************创建桶******************************/
const createBucket = () => {};

/****************************创建桶******************************/
</script>

<style lang="scss" scoped></style>
