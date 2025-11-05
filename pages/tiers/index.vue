<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">{{ t('Tiers') }}</h1>
      <template #actions>
        <Button variant="outline" @click="openNewForm">
          <Icon name="ri:add-line" class="size-4" />
          <span>{{ t('Add Tier') }}</span>
        </Button>
        <Button variant="outline" @click="() => refresh()">
          <Icon name="ri:refresh-line" class="size-4" />
          <span>{{ t('Refresh') }}</span>
        </Button>
      </template>
    </page-header>

    <DataTable
      :table="table"
      :is-loading="loading"
      :empty-title="t('No Tiers')"
      :empty-description="t('Add tiers to configure remote storage destinations.')"
    />

    <tiers-new-form ref="newFormRef" @search="() => refresh()" />
    <tiers-change-key
      ref="changeKeyRef"
      v-model:visible="changeKeyVisible"
      v-model:name="selectedTier"
      @search="() => refresh()"
    />
  </page>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import type { ColumnDef } from '@tanstack/vue-table'
import { h, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const usetier = useTiers()

interface TierRow {
  type: string
  [key: string]: any
}

const tiersData = ref<TierRow[]>([])
const loading = ref(false)

const getConfig = (row: TierRow) => {
  switch (row.type) {
    case 'rustfs':
      return row.rustfs
    case 'minio':
      return row.minio
    case 's3':
      return row.s3
    case 'aliyun':
      return row.aliyun
    case 'tencent':
      return row.tencent
    case 'huaweicloud':
      return row.huaweicloud
    case 'azure':
      return row.azure
    case 'gcs':
      return row.gcs
    case 'r2':
      return row.r2
    default:
      return undefined
  }
}

const columns: ColumnDef<TierRow>[] = [
  {
    header: () => t('Tier Type'),
    accessorKey: 'type',
    cell: ({ row }) => h('span', { class: 'capitalize' }, row.original.type || '-'),
  },
  {
    id: 'name',
    header: () => t('Name'),
    accessorFn: row => getConfig(row)?.name || '-',
  },
  {
    id: 'endpoint',
    header: () => t('Endpoint'),
    accessorFn: row => getConfig(row)?.endpoint || '-',
  },
  {
    id: 'bucket',
    header: () => t('Bucket'),
    accessorFn: row => getConfig(row)?.bucket || '-',
  },
  {
    id: 'prefix',
    header: () => t('Prefix'),
    accessorFn: row => getConfig(row)?.prefix || '-',
  },
  {
    id: 'region',
    header: () => t('Region'),
    accessorFn: row => getConfig(row)?.region || '-',
  },
  {
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    cell: ({ row }) =>
      h('div', { class: 'flex items-centergap-2' }, [
        h(
          Button,
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => openChangeKey(row.original),
          },
          () => [h(Icon, { name: 'ri:key-2-line', class: 'size-4' }), h('span', t('Update Key'))]
        ),
        h(
          Button,
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => confirmDelete(row.original),
          },
          () => [h(Icon, { name: 'ri:delete-bin-5-line', class: 'size-4' }), h('span', t('Delete'))]
        ),
      ]),
  },
]

const { table } = useDataTable<TierRow>({
  data: tiersData,
  columns,
  getRowId: row => `${row.type}-${getConfig(row)?.name}`,
})

const loadTiers = async () => {
  loading.value = true
  try {
    const response = await usetier.listTiers()
    tiersData.value = response ?? []
  } catch (error) {
    tiersData.value = []
  } finally {
    loading.value = false
  }
}

const refresh = async () => {
  await loadTiers()
}

loadTiers()

const newFormRef = ref<{ open: () => void }>()
const openNewForm = () => newFormRef.value?.open()

const changeKeyRef = ref()
const changeKeyVisible = ref(false)
const selectedTier = ref('')

const openChangeKey = (row: TierRow) => {
  selectedTier.value = getConfig(row)?.name || ''
  changeKeyVisible.value = true
}

const confirmDelete = (row: TierRow) => {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete this tier?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: () => deleteTier(row),
  })
}

const deleteTier = async (row: TierRow) => {
  try {
    await usetier.removeTiers(getConfig(row)?.name || '')
    message.success(t('Delete Success'))
    refresh()
  } catch (error: any) {
    message.error(error?.message || t('Delete Failed'))
  }
}
</script>
