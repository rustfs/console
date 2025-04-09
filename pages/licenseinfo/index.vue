<template>
  <div v-if="hasLicense">
     <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">企业授权</h1>
      </template>
    </page-header>
    <page-content>
      <!-- 顶部信息 -->
    <n-card>
      <n-flex justify="space-between" class="top-info py-4 px-2">
        <n-space vertical v-if="new Date().getTime() - siteConfig.license.expired*1000<0">
          <n-space><n-tag type="success">企业版许可证</n-tag> <n-text style="line-height: 28px;" type="success">状态：正常</n-text></n-space>
          <n-space>许可证有效期至：{{ endDate }}</n-space>
        </n-space>
        <n-space vertical v-else>
          <n-space><n-tag type="error">企业版许可证</n-tag> <n-text style="line-height: 28px;" type="error">状态：过期</n-text></n-space>
          <n-space>许可证有效期：{{ endDate }}</n-space>
        </n-space>
        <n-space >
          <n-button type="primary"  @click="updateLicense">
            <Icon name="ri:upload-fill" class="mx-2"></Icon>
            更新许可证</n-button>
          <n-button type="default"  @click="contactSupport"><Icon name="ri:customer-service-2-line" class="mx-2"></Icon>
            <a href="https://ww18.53kf.com/webCompany.php?arg=11003151&kf_sign=DA4MDMTc0Ng4MjE1MjEzODAyNDkyMDAyNzMwMDMxNTE%253D&style=2"  target="_blank">联系支持</a>
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
    <n-card title="许可证详情" class="license-details mt-4">
      <n-descriptions :columns="2" :bordered="true">
        <n-descriptions-item label="授权公司">{{ siteConfig.license?.name }}</n-descriptions-item>
        <n-descriptions-item label="许可证密钥">{{ licenseKey }}</n-descriptions-item>
        <n-descriptions-item label="授权用户数">无限制</n-descriptions-item>
        <n-descriptions-item label="技术支持级别">企业级（7x24x365）</n-descriptions-item>
      </n-descriptions>
    </n-card>
    
    <!-- 软件服务 -->
    <n-card title="客户服务" class="license-details mt-4">
      <n-descriptions :columns="2" :bordered="true">
        <n-descriptions-item label="服务热线">
         400-033-5363
        </n-descriptions-item>
        <n-descriptions-item label="版本号">v2.3</n-descriptions-item>
        <n-descriptions-item label="服务邮箱">hello@rustfs.com</n-descriptions-item>
        <n-descriptions-item label="企业服务等级">白金级服务</n-descriptions-item>
        <n-descriptions-item label="现场技术服务">支持</n-descriptions-item>
        <n-descriptions-item label="远程技术保障">支持</n-descriptions-item>
        <n-descriptions-item label="技术培训">支持</n-descriptions-item>
        <n-descriptions-item label="现场部署">支持</n-descriptions-item>
        <n-descriptions-item label="故障紧急响应">支持</n-descriptions-item>
        <n-descriptions-item label="响应等级">一小时响应</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <!-- 功能权限列表 -->
    <n-card class="mt-4" title="功能权限列表">
      <n-data-table :data="permissions" :bordered="true" :single-line="false" :columns="columns" />
    </n-card>

     <!-- 技术参数 -->
    <n-card title="技术参数" class="license-details mt-4">
      <n-descriptions :columns="2" :bordered="true">
        <n-descriptions-item label="服务热线">
         400-033-5363
        </n-descriptions-item>
        <n-descriptions-item label="支持操作系统">Windows、Linux、MacOS</n-descriptions-item>
        <n-descriptions-item label="支持CPU架构">Amd64、ARM、AMR64、MIPS64、S390X、PPC64LE</n-descriptions-item>
        <n-descriptions-item label="虚拟化平台支持">VMWare、Kubernetes、KVM、Zstack、云宏</n-descriptions-item>
        <n-descriptions-item label="开发语言要求">内存安全语言后端开发语言，如：Golang、Rust</n-descriptions-item>
        <n-descriptions-item label="启动模式SNND（单机单盘）">支持</n-descriptions-item>
        <n-descriptions-item label="启动模式SNMD（单机多盘）">支持</n-descriptions-item>
        <n-descriptions-item label="启动模式MNMD（多机多盘）">支持</n-descriptions-item>
        <n-descriptions-item label="桶个数">无限制</n-descriptions-item>
        <n-descriptions-item label="对象数量">无限制</n-descriptions-item>
        <n-descriptions-item label="EC模式">里德所罗门矩阵</n-descriptions-item>
        <n-descriptions-item label="访问控制">IAM Policy</n-descriptions-item>
        <n-descriptions-item label="安全传输">支持HTTPS、TLS</n-descriptions-item>
        <n-descriptions-item label="桶策略">公开、私有、自定义</n-descriptions-item>
        <n-descriptions-item label="单个对象">最大50TB</n-descriptions-item>
        <n-descriptions-item label="数据冗余">支持纠删码（Erasure Coding）</n-descriptions-item>
        <n-descriptions-item label="数据备份">支持本地和跨数据中心备份</n-descriptions-item>
        <n-descriptions-item label="扩展性">水平扩展，无单点故障</n-descriptions-item>
        <n-descriptions-item label="读写性能">高并发、低延迟</n-descriptions-item>
        <n-descriptions-item label="身份验证扩容">OpenID、LDAP</n-descriptions-item>
        <n-descriptions-item label="S3兼容性">完全兼容Amazon S3 API</n-descriptions-item>
        <n-descriptions-item label="SDK支持">支持Java、Python、Go、Node.js等多种编程语言</n-descriptions-item>
        <n-descriptions-item label="桶通知">支持</n-descriptions-item>
        <n-descriptions-item label="支持RustyVault国产加密">支持</n-descriptions-item>
        <n-descriptions-item label="支持HashiCorp加密">支持</n-descriptions-item>
        <n-descriptions-item label="生命周期管理">支持</n-descriptions-item>
        <n-descriptions-item label="s3fs">支持</n-descriptions-item>
        <n-descriptions-item label="Prometheus">支持</n-descriptions-item>
        <n-descriptions-item label="桶配额">支持</n-descriptions-item>
        <n-descriptions-item label="审记">支持</n-descriptions-item>
        <n-descriptions-item label="日志">支持</n-descriptions-item>
        <n-descriptions-item label="对象修复">支持</n-descriptions-item>
        <n-descriptions-item label="WORM（Write Once Read Many）">支持</n-descriptions-item>
        <n-descriptions-item label="远程分层">支持</n-descriptions-item>
        <n-descriptions-item label="分层转移">支持</n-descriptions-item>
        <n-descriptions-item label="对象分享">支持</n-descriptions-item>
        <n-descriptions-item label="负载均衡">支持</n-descriptions-item>
        <n-descriptions-item label="对象标签">支持</n-descriptions-item>
        <n-descriptions-item label="分片上传">支持</n-descriptions-item>
        <n-descriptions-item label="密钥创建">支持</n-descriptions-item>
        <n-descriptions-item label="密钥过期">支持</n-descriptions-item>
        <n-descriptions-item label="硬盘坏点检查">支持</n-descriptions-item>
        <n-descriptions-item label="Bitrot">支持</n-descriptions-item>
        <n-descriptions-item label="版本控制">支持</n-descriptions-item>
      </n-descriptions>
    </n-card>
    </page-content >
  </div>
  
  <articleL v-else></articleL>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import dayjs from 'dayjs';
import { Icon } from '#components'
import {NButton} from 'naive-ui'
import articleL from './article.vue'
import type { SiteConfig } from "~/types/config";
const siteConfig = useNuxtApp().$siteConfig as SiteConfig;
const hasLicense = siteConfig.license

// 服务开始
const startDate = new Date('2025-01-01');
// 服务结束
const endDate = dayjs(siteConfig.license.expired*1000).format('YYYY-MM-DD');

// 数据
const licenseKey = ref('RUSTFS-ENTERPRISE-127-183');
const permissions = ref([
  { name: '单机多盘', description: '支持在同一台服务器上管理多个存储盘，提高存储资源利用率并简化管理与维护工作', status: '已启用' },
  { name: '高级监控', description: '提供详细的性能监控和告警机制，帮助管理员实时了解系统运行状态，确保系统稳定性和可靠性', status: '已启用' },
  { name: 'Metrics', description: '收集和展示关键性能指标（如CPU、内存、磁盘I/O等），通过可视化图表帮助用户理解系统运行状况和性能瓶颈', status: '已启用' },
  { name: '日志系统', description: '记录系统运行中的各种事件和操作，便于后续分析和排查问题，提供灵活的日志级别设置和查询接口', status: '已启用' }
]);

// 列表
const columns = ref([
  { title: '功能名称', key: 'name' },
  { title: '功能描述', key: 'description' },
  { title: '状态', key: 'status',
   render(row:any) {
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