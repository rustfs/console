<template>
  <div v-if="hasLicense">
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Enterprise License') }}</h1>
      </template>
    </page-header>

    <page-content class="space-y-6">
      <AppCard class="space-y-4">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-3">
              <AppBadge :variant="hasValidLicense ? 'primary' : 'danger'">
                {{ t('Enterprise License') }}
              </AppBadge>
              <span :class="['text-sm font-medium', hasValidLicense ? 'text-emerald-600' : 'text-rose-500']">
                {{ t('Status') }}：{{ hasValidLicense ? t('Normal') : t('Expired') }}
              </span>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ t('License Valid Until') }}：{{ endDate }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <AppButton variant="primary" @click="updateLicense">
              <Icon name="ri:upload-fill" class="mr-2 size-4" />
              {{ t('Update License') }}
            </AppButton>
            <AppButton variant="outline" @click="contactSupport">
              <Icon name="ri:customer-service-2-line" class="mr-2 size-4" />
              {{ t('Contact Support') }}
            </AppButton>
          </div>
        </div>
      </AppCard>

      <div class="grid gap-6 lg:grid-cols-2">
        <AppCard class="space-y-4">
          <p class="text-base font-semibold">{{ t('License Details') }}</p>
          <dl class="grid gap-4 sm:grid-cols-2">
            <div v-for="item in licenseDetails" :key="item.label" class="space-y-1">
              <dt class="text-xs font-medium uppercase text-muted-foreground">{{ item.label }}</dt>
              <dd class="text-sm text-foreground">{{ item.value }}</dd>
            </div>
          </dl>
        </AppCard>

        <AppCard class="space-y-4">
          <p class="text-base font-semibold">{{ t('Customer Service') }}</p>
          <dl class="grid gap-4 sm:grid-cols-2">
            <div v-for="item in serviceInfo" :key="item.label" class="space-y-1">
              <dt class="text-xs font-medium uppercase text-muted-foreground">{{ item.label }}</dt>
              <dd class="text-sm text-foreground">{{ item.value }}</dd>
            </div>
          </dl>
        </AppCard>
      </div>

      <AppCard class="space-y-4">
        <p class="text-base font-semibold">{{ t('Feature Permissions') }}</p>
        <div class="overflow-hidden rounded-lg border border-border/60">
          <table class="w-full text-sm">
            <thead class="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th class="px-4 py-2">{{ t('Name') }}</th>
                <th class="px-4 py-2">{{ t('Description') }}</th>
                <th class="px-4 py-2">{{ t('Status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in permissions" :key="item.name" class="border-t">
                <td class="px-4 py-3 font-medium">{{ item.name }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ item.description }}</td>
                <td class="px-4 py-3">
                  <AppBadge variant="primary">{{ item.status }}</AppBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <AppCard class="space-y-4">
        <p class="text-base font-semibold">{{ t('Technical Parameters') }}</p>
        <dl class="grid gap-4 sm:grid-cols-2">
          <div v-for="item in technicalParameters" :key="item.label" class="space-y-1">
            <dt class="text-xs font-medium uppercase text-muted-foreground">{{ item.label }}</dt>
            <dd class="text-sm text-foreground">{{ item.value }}</dd>
          </div>
        </dl>
      </AppCard>
    </page-content>
  </div>

  <LicenseArticle v-else />
</template>

<script setup lang="ts">
import { Icon } from '#components'
import dayjs from 'dayjs'
import { AppBadge, AppButton, AppCard } from '@/components/app'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SiteConfig } from '~/types/config'
import LicenseArticle from './components/license-article.vue'

const { t } = useI18n()
const siteConfig = useNuxtApp().$siteConfig as SiteConfig
const hasLicense = false
const hasValidLicense = false
const endDate = dayjs().format('YYYY-MM-DD')

const licenseKey = ref('RUSTFS-ENTERPRISE-127-183')

const licenseDetails = computed(() => [
  { label: t('Licensed Company'), value: t('No License') },
  { label: t('License Key'), value: licenseKey.value },
  { label: t('Licensed Users'), value: t('Unlimited') },
  { label: t('Support Level'), value: `${t('Enterprise')} (7x24x365)` },
])

const serviceInfo = computed(() => [
  { label: t('Service Hotline'), value: '400-033-5363' },
  { label: t('Version'), value: 'v2.3' },
  { label: t('Service Email'), value: 'hello@rustfs.com' },
  { label: t('Enterprise Service Level'), value: t('Platinum Service') },
  { label: t('On-site Technical Service'), value: t('Supported') },
  { label: t('Remote Technical Support'), value: t('Supported') },
  { label: t('Technical Training'), value: t('Supported') },
  { label: t('On-site Deployment'), value: t('Supported') },
  { label: t('Emergency Response'), value: t('Supported') },
  { label: t('Response Level'), value: t('One-hour Response') },
])

const permissions = computed(() => [
  {
    name: t('Single Machine Multiple Disks'),
    description: t(
      'Supports managing multiple storage disks on a single server to improve storage resource utilization and simplify management and maintenance'
    ),
    status: t('Enabled'),
  },
  {
    name: t('Advanced Monitoring'),
    description: t(
      'Provides detailed performance monitoring and alerting mechanisms to help administrators understand system status in real-time and ensure system stability and reliability'
    ),
    status: t('Enabled'),
  },
  {
    name: t('Metrics'),
    description: t(
      'Collects and displays key performance indicators (such as CPU, memory, disk I/O, etc.) through visualized charts to help users understand system operation status and performance bottlenecks'
    ),
    status: t('Enabled'),
  },
])

const technicalParameters = computed(() => [
  { label: t('Service Hotline'), value: '400-033-5363' },
  { label: t('Supported OS'), value: 'Windows、Linux、MacOS' },
  { label: t('Supported CPU Architecture'), value: 'Amd64、ARM、AMR64、MIPS64、S390X、PPC64LE' },
  { label: t('Virtualization Platform Support'), value: 'KVM、VMware、Hyper-V、Docker、Kubernetes' },
  { label: t('Development Language Requirements'), value: 'C++、Java、Rust、Go、Python、Node.js' },
  { label: t('SNND Mode'), value: t('Supported') },
  { label: t('SNMD Mode'), value: t('Supported') },
  { label: t('MNMD Mode'), value: t('Supported') },
  { label: t('Bucket Count'), value: t('Unlimited') },
  { label: t('Object Count'), value: t('Unlimited') },
  { label: t('EC Mode'), value: t('Reed-Solomon Matrix') },
  { label: t('Access Control'), value: 'IAM Policy' },
  { label: t('Secure Transport'), value: t('Supports HTTPS, TLS') },
  { label: t('Bucket Policy'), value: t('Public, Private, Custom') },
  { label: t('Single Object'), value: t('Max 50TB') },
  { label: t('Data Redundancy'), value: t('Supports Erasure Coding') },
  { label: t('Data Backup'), value: t('Supported') },
  { label: t('Scalability'), value: t('Supported') },
  { label: t('Read/Write Performance'), value: t('Supports high concurrency operations') },
  { label: t('Identity Authentication Expansion'), value: 'OpenID、LDAP' },
  { label: t('S3 Compatibility'), value: t('Supported') },
  { label: t('SDK Support'), value: 'Java、Python、Go、Rust、Node.js' },
  { label: t('Bucket Notification'), value: t('Supported') },
  { label: t('RustyVault Encryption'), value: t('Supported') },
  { label: t('HashiCorp Encryption'), value: t('Supported') },
  { label: t('Lifecycle Management'), value: t('Supported') },
  { label: t('s3fs'), value: t('Supported') },
  { label: t('Prometheus'), value: t('Supported') },
  { label: t('Bucket Quota'), value: t('Supported') },
  { label: t('Audit'), value: t('Supported') },
  { label: t('Logs'), value: t('Supported') },
  { label: t('Object Repair'), value: t('Supported') },
  { label: t('WORM'), value: t('Supported') },
  { label: t('Remote Tiering'), value: t('Supported') },
  { label: t('Tiering Transfer'), value: t('Supported') },
  { label: t('Object Sharing'), value: t('Supported') },
  { label: t('Load Balancing'), value: t('Supported') },
  { label: t('Object Tags'), value: t('Supported') },
  { label: t('Multipart Upload'), value: t('Supported') },
  { label: t('Key Creation'), value: t('Supported') },
  { label: t('Key Expiration'), value: t('Supported') },
  { label: t('Disk Bad Spot Check'), value: t('Supported') },
  { label: t('Bitrot'), value: t('Supported') },
  { label: t('Version Control'), value: t('Supported') },
])

const contactSupport = () => {
  window.open(
    'https://ww18.53kf.com/webCompany.php?arg=11003151&kf_sign=DA4MDMTc0Ng4MjE1MjEzODAyNDkyMDAyNzMwMDMxNTE%253D&style=2',
    '_blank'
  )
}

const updateLicense = () => {
  // 占位逻辑
}
</script>
