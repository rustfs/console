<template>
  <div >
     <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">企业授权</h1>
      </template>
    </page-header>
    <page-content>
      <!-- 顶部信息 -->
    <n-card>
      <n-flex justify="space-between" class="top-info py-4 px-2">
        <n-space vertical>
          <n-space><n-tag type="success">企业版许可证</n-tag> <n-text style="line-height: 28px;" type="success">状态：正常</n-text></n-space>
          <n-space>许可证有效期：2024-01-01 至 2025-01-01</n-space>
        </n-space>
        <n-space >
          <n-button type="primary"  @click="updateLicense">
            <Icon name="ri:upload-fill" class="mx-2"></Icon>
            更新许可证</n-button>
          <n-button type="default"  @click="contactSupport"><Icon name="ri:customer-service-2-line" class="mx-2"></Icon>联系支持</n-button>
        </n-space>
      </n-flex>

      <!-- 许可证有效期进度条 -->
      <div class="progress-bar px-2" >
        <!-- <n-space>许可证有效期</n-space> -->
        <n-progress :percentage="75" indicator-placement="outside" :height="4"> <span style="text-align: center">剩余75%</span></n-progress>
      </div>
    </n-card>
    <!-- 存储使用统计和带宽使用统计 -->
    <n-flex class="flex my-4">
      <n-card class="chart-container"  title="存储使用统计">
        <Echarts1></Echarts1>
      </n-card>
      <n-card class="chart-container" title="带宽使用统计">
        <Echarts2></Echarts2>
      </n-card>
    </n-flex>

    <!-- 许可证详情 -->
    <n-card title="许可证详情" class="license-details">
      <n-descriptions :columns="2" :bordered="true">
        <n-descriptions-item label="许可证密钥">
         {{ licenseKey }}
        </n-descriptions-item>
        <n-descriptions-item label="存储容量限制">10 TB</n-descriptions-item>
        <n-descriptions-item label="授权公司">深圳科技创新有限公司</n-descriptions-item>
        <n-descriptions-item label="带宽限制">1 Gbps</n-descriptions-item>
        <n-descriptions-item label="授权用户数">100 人</n-descriptions-item>
        <n-descriptions-item label="技术支持级别">企业级 24x7</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <!-- 功能权限列表 -->
    <n-card class="mt-4" title="功能权限列表">
      <n-data-table :data="permissions" :bordered="true" :single-line="false" :columns="columns" />
    </n-card>
    </page-content >
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Icon } from '#components'
import {NButton} from 'naive-ui'
import Echarts1  from './chart-1.vue'
import Echarts2  from './chart-2.vue'


// 数据
const licenseKey = ref('MINIO-ENTERPRISE-XYZ-123-456-789');
const bandwidthData = ref([
  { x: '周一', y: 150 },
  { x: '周二', y: 200 },
  { x: '周三', y: 250 },
  { x: '周四', y: 200 },
  { x: '周五', y: 150 },
  { x: '周六', y: 100 },
  { x: '周日', y: 250 }
]);
const permissions = ref([
  { name: '多集群管理', description: '支持多个存储集群的统一管理', status: '已启用' },
  { name: '高级监控', description: '详细的性能监控和告警功能', status: '已启用' },
  { name: '数据加密', description: '支持数据传输和存储加密', status: '已启用' },
  { name: '多租户', description: '支持多租户隔离', status: '已启用' },
  { name: 'IAM集成', description: '支持企业身份认证系统集成', status: '未启用' }
]);

// 列表
const columns = ref([
  { title: '功能名称', key: 'name' },
  { title: '功能描述', key: 'description' },
  { title: '状态', key: 'status',
   render(row) {
        return h(
          NButton,
          {
            size: 'small',
            type: row.status === '已启用' ? 'success' : 'default',
          },
          { default: () => row.status }
        )
      } }
]);

// 方法
const updateLicense = () => {
  console.log('更新许可证');
};

const contactSupport = () => {
  console.log('联系支持');
};
</script>

<style scoped>
.chart-container {
  flex: 1;
  padding: 20px;
  border-radius: 8px;
}


</style>