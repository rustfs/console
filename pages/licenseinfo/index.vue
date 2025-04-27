<template>
  <div v-if="hasLicense">
     <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Enterprise License') }}</h1>
      </template>
    </page-header>
    <page-content>
      <!-- 顶部信息 -->
    <n-card>
      <n-flex justify="space-between" class="top-info py-4 px-2">
        <n-space vertical v-if="new Date().getTime() - siteConfig.license.expired*1000<0">
          <n-space><n-tag type="success">{{ t('Enterprise License') }}</n-tag> <n-text style="line-height: 28px;" type="success">{{ t('Status') }}：{{ t('Normal') }}</n-text></n-space>
          <n-space>{{ t('License Valid Until') }}：{{ endDate }}</n-space>
        </n-space>
        <n-space vertical v-else>
          <n-space><n-tag type="error">{{ t('Enterprise License') }}</n-tag> <n-text style="line-height: 28px;" type="error">{{ t('Status') }}：{{ t('Expired') }}</n-text></n-space>
          <n-space>{{ t('License Valid Until') }}：{{ endDate }}</n-space>
        </n-space>
        <n-space >
          <n-button type="primary"  @click="updateLicense">
            <Icon name="ri:upload-fill" class="mx-2"></Icon>
            {{ t('Update License') }}</n-button>
          <n-button type="default"  @click="contactSupport"><Icon name="ri:customer-service-2-line" class="mx-2"></Icon>
            <a href="https://ww18.53kf.com/webCompany.php?arg=11003151&kf_sign=DA4MDMTc0Ng4MjE1MjEzODAyNDkyMDAyNzMwMDMxNTE%253D&style=2"  target="_blank">{{ t('Contact Support') }}</a>
            </n-button>
        </n-space>
      </n-flex>

      <!-- 许可证有效期进度条 -->
      <!-- <div class="progress-bar px-2" >
        <n-progress :percentage="calculateProgressPercentage(startDate,endDate)" indicator-placement="outside" :height="4"> <span style="text-align: center">剩余{{100-calculateProgressPercentage(startDate,endDate)}}%</span></n-progress>
      </div> -->
    </n-card>
    <!-- 存储使用统计和带宽使用统计 -->
    <!-- <n-flex class="flex my-4">
      <n-card class="chart-container"  title="存储使用统计">
        <Echarts1></Echarts1>
      </n-card>
      <n-card class="chart-container" title="带宽使用统计">
        <Echarts2></Echarts2>
      </n-card>
    </n-flex> -->
    <!-- 许可证详情 -->
    <n-card :title="t('License Details')" class="license-details mt-4">
      <n-descriptions :columns="2" :bordered="true">
        <n-descriptions-item :label="t('Licensed Company')">{{ siteConfig.license?.name }}</n-descriptions-item>
        <n-descriptions-item :label="t('License Key')">{{ licenseKey }}</n-descriptions-item>
        <n-descriptions-item :label="t('Licensed Users')">{{ t('Unlimited') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Support Level')">{{ t('Enterprise') }} (7x24x365)</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <!-- 软件服务 -->
    <n-card :title="t('Customer Service')" class="license-details mt-4">
      <n-descriptions :columns="2" :bordered="true">
        <n-descriptions-item :label="t('Service Hotline')">
         400-033-5363
        </n-descriptions-item>
        <n-descriptions-item :label="t('Version')">v2.3</n-descriptions-item>
        <n-descriptions-item :label="t('Service Email')">hello@rustfs.com</n-descriptions-item>
        <n-descriptions-item :label="t('Enterprise Service Level')">{{ t('Platinum Service') }}</n-descriptions-item>
        <n-descriptions-item :label="t('On-site Technical Service')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Remote Technical Support')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Technical Training')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('On-site Deployment')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Emergency Response')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Response Level')">{{ t('One-hour Response') }}</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <!-- 功能权限列表 -->
    <n-card class="mt-4" :title="t('Feature Permissions')">
      <n-data-table :data="permissions" :bordered="true" :single-line="false" :columns="columns" />
    </n-card>

     <!-- 技术参数 -->
    <n-card :title="t('Technical Parameters')" class="license-details mt-4">
      <n-descriptions :columns="2" :bordered="true">
        <n-descriptions-item :label="t('Service Hotline')">
         400-033-5363
        </n-descriptions-item>
        <n-descriptions-item :label="t('Supported OS')">Windows、Linux、MacOS</n-descriptions-item>
        <n-descriptions-item :label="t('Supported CPU Architecture')">Amd64、ARM、AMR64、MIPS64、S390X、PPC64LE</n-descriptions-item>
        <n-descriptions-item :label="t('Virtualization Platform Support')">VMWare、Kubernetes、KVM、Zstack、云宏</n-descriptions-item>
        <n-descriptions-item :label="t('Development Language Requirements')">{{ t('Memory safe backend language such as') }}：Golang、Rust</n-descriptions-item>
        <n-descriptions-item :label="t('SNND Mode')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('SNMD Mode')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('MNMD Mode')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Bucket Count')">{{ t('Unlimited') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Object Count')">{{ t('Unlimited') }}</n-descriptions-item>
        <n-descriptions-item :label="t('EC Mode')">{{ t('Reed-Solomon Matrix') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Access Control')">IAM Policy</n-descriptions-item>
        <n-descriptions-item :label="t('Secure Transport')">{{ t('Supports HTTPS, TLS') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Bucket Policy')">{{ t('Public, Private, Custom') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Single Object')">{{ t('Max 50TB') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Data Redundancy')">{{ t('Supports Erasure Coding') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Data Backup')">{{ t('Supports local and cross-datacenter backup') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Scalability')">{{ t('Horizontal scaling, no single point of failure') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Read/Write Performance')">{{ t('High concurrency, low latency') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Identity Authentication Expansion')">OpenID、LDAP</n-descriptions-item>
        <n-descriptions-item :label="t('S3 Compatibility')">{{ t('Fully compatible with Amazon S3 API') }}</n-descriptions-item>
        <n-descriptions-item :label="t('SDK Support')">{{ t('Supports multiple programming languages including Java, Python, Go, Node.js') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Bucket Notification')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('RustyVault Encryption')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('HashiCorp Encryption')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Lifecycle Management')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('s3fs')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Prometheus')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Bucket Quota')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Audit')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Logs')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Object Repair')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('WORM')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Remote Tiering')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Tiering Transfer')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Object Sharing')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Load Balancing')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Object Tags')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Multipart Upload')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Key Creation')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Key Expiration')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Disk Bad Spot Check')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Bitrot')">{{ t('Supported') }}</n-descriptions-item>
        <n-descriptions-item :label="t('Version Control')">{{ t('Supported') }}</n-descriptions-item>
      </n-descriptions>
    </n-card>
    </page-content >
  </div>

  <articleL v-else></articleL>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import dayjs from 'dayjs'
import { NButton } from 'naive-ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SiteConfig } from "~/types/config"
import articleL from './article.vue'

const { t } = useI18n()
const siteConfig = useNuxtApp().$siteConfig as SiteConfig;
const hasLicense = siteConfig.license

// 服务开始
const startDate = new Date('2025-01-01');
// 服务结束
const endDate = dayjs(siteConfig.license.expired*1000).format('YYYY-MM-DD');

// 数据
const licenseKey = ref('RUSTFS-ENTERPRISE-127-183');
const permissions = ref([
  { name: t('Single Machine Multiple Disks'), description: t('Supports managing multiple storage disks on a single server to improve storage resource utilization and simplify management and maintenance'), status: t('Enabled') },
  { name: t('Advanced Monitoring'), description: t('Provides detailed performance monitoring and alerting mechanisms to help administrators understand system status in real-time and ensure system stability and reliability'), status: t('Enabled') },
  { name: t('Metrics'), description: t('Collects and displays key performance indicators (such as CPU, memory, disk I/O, etc.) through visualized charts to help users understand system operation status and performance bottlenecks'), status: t('Enabled') },
  { name: t('Logging System'), description: t('Records various events and operations during system operation for subsequent analysis and troubleshooting, providing flexible log level settings and query interfaces'), status: t('Enabled') }
]);

// 列表
const columns = ref([
  { title: t('Feature Name'), key: 'name' },
  { title: t('Feature Description'), key: 'description' },
  { title: t('Status'), key: 'status',
   render(row:any) {
        return h(
          NButton,
          {
            size: 'small',
            type: row.status === t('Enabled') ? 'success' : 'default',
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

function calculateProgressPercentage (startDate: Date, endDate: Date) {
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();
  const currentTimestamp = new Date().getTime();

  const elapsed = currentTimestamp - startTimestamp;
  const totalDuration = endTimestamp - startTimestamp;

  if (totalDuration === 0) {
    return 0; // 避免除以零的情况
  }

  const progressPercentage = Number((elapsed / totalDuration).toFixed(2))*100;
  return progressPercentage ;
}
</script>

<style lang="scss" scoped>
</style>
