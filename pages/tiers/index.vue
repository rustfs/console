<template>
  <div class="flex flex-col gap-6">
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Tiers') }}</h1>
      </template>
    </page-header>

    <page-content class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-end gap-2">
        <AppButton variant="secondary" @click="openNewForm">
          <Icon name="ri:add-line" class="size-4" />
          <span>{{ t('Add Tier') }}</span>
        </AppButton>
        <AppButton variant="outline" @click="refresh">
          <Icon name="ri:refresh-line" class="size-4" />
          <span>{{ t('Refresh') }}</span>
        </AppButton>
      </div>

      <AppCard padded class="border border-border/60">
        <AppDataTable
          :table="table"
          :is-loading="loading"
          :empty-title="t('No Tiers')"
          :empty-description="t('Add tiers to configure remote storage destinations.')"
        />
      </AppCard>

      <tiers-new-form ref="newFormRef" @search="refresh" />
      <tiers-change-key ref="changeKeyRef" v-model:visible="changeKeyVisible" v-model:name="selectedTier" @search="refresh" />
    </page-content>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import type { ColumnDef } from '@tanstack/vue-table'
import { AppButton, AppCard, AppDataTable, AppTag } from '@/components/app'
import { useDataTable } from '@/components/app/data-table'
import { computed, h, ref } from 'vue'
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

const columns: ColumnDef<TierRow>[] = [
  {
    header: () => t('Tier Type'),
    accessorKey: 'type',
    cell: ({ row }) => h('span', { class: 'capitalize' }, row.original.type || '-'),
  },
  {
    header: () => t('Name'),
    accessorFn: row => getConfig(row)?.name || '-',
  },
  {
    header: () => t('Endpoint'),
    accessorFn: row => getConfig(row)?.endpoint || '-',
  },
  {
    header: () => t('Bucket'),
    accessorFn: row => getConfig(row)?.bucket || '-',
  },
  {
    header: () => t('Prefix'),
    accessorFn: row => getConfig(row)?.prefix || '-',
  },
  {
    header: () => t('Region'),
    accessorFn: row => getConfig(row)?.region || '-',
  },
  {
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    cell: ({ row }) =>
      h('div', { class: 'flex justify-center gap-2' }, [
        h(
          AppButton,
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => openChangeKey(row),
          },
          () => [h(Icon, { name: 'ri:key-2-line', class: 'size-4' }), h('span', t('Update Key'))]
        ),
        h(
          AppButton,
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => confirmDelete(row),
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

const getConfig = (row: TierRow) => {
  switch (row.type) {
    case 'rustfs':
      return row.rustfs
    case 'minio':
      return row.minio
    case 's3':
      return row.s3
    default:
      return undefined
  }
}

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

const refresh = () => {
  loadTiers()
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
    await usetier.deleteTiers(getConfig(row)?.name || '')
    message.success(t('Delete Success'))
    refresh()
  } catch (error: any) {
    message.error(error?.message || t('Delete Failed'))
  }
}
</script>
