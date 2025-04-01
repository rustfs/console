<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">站点复制</h1>
      </template>
    </page-header>
    <page-content class="flex flex-col gap-4">
      <n-flex justify="end" >
          <n-button @click="() => openForm()">
            <Icon name="ri:add-line" class="mr-2" />
            <span>添加站点</span>
          </n-button>
      </n-flex>
      
      <n-card class="flex flex-center" style="height:400px">
        <n-empty description="空空如也" ></n-empty>
      </n-card>
      <!-- <n-data-table class="border dark:border-neutral-700 rounded overflow-hidden" :columns="columns" :data="pageData" :pagination="false" :bordered="false" /> -->
       <site-replication-new-form ref="addFormRef"></site-replication-new-form>
    </page-content>

  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import { NButton } from 'naive-ui'

const addFormRef = ref()
const openForm = ()=>{
  addFormRef.value.open()
}

</script>
