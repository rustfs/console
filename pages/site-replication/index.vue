<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Site Replication') }}</h1>
      </template>
    </page-header>
    <page-content class="flex flex-col gap-4">
      <n-flex justify="end" >
          <n-button @click="() => openForm()">
            <Icon name="ri:add-line" class="mr-2" />
            <span>{{ t('Add Site') }}</span>
          </n-button>
      </n-flex>

      <n-card class="flex flex-center" style="height:400px">
        <n-empty :description="t('No Data')" ></n-empty>
      </n-card>
      <!-- <n-data-table class="border dark:border-neutral-700 rounded overflow-hidden" :columns="columns" :data="pageData" :pagination="false" :bordered="false" /> -->
       <site-replication-new-form ref="addFormRef"></site-replication-new-form>
    </page-content>

  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import { NButton } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const addFormRef = ref()
const openForm = ()=>{
  addFormRef.value.open()
}

</script>
