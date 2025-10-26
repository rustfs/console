<template>
  <div class="flex flex-col gap-6">
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('IAM Policies') }}</h1>
      </template>
    </page-header>

    <page-content class="flex flex-col gap-4">
      <div
        class="flex flex-col gap-4 rounded-lg border border-border/60 bg-background/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between"
      >
        <div class="flex w-full max-w-sm items-center gap-2">
          <Icon name="ri:search-2-line" class="size-4 text-muted-foreground" />
          <AppInput v-model="searchTerm" :placeholder="t('Search')" />
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <AppButton variant="secondary" @click="handleNew">
            <Icon name="ri:add-line" class="size-4" />
            <span>{{ t('New Policy') }}</span>
          </AppButton>
        </div>
      </div>

      <AppCard padded class="border border-border/60">
        <AppDataTable
          :table="table"
          :is-loading="loading"
          :empty-title="t('No Policies')"
          :empty-description="t('Create a policy to manage access control templates.')"
        />
      </AppCard>
    </page-content>

    <policies-form-item v-model:show="showPolicyForm" :policy="current" @saved="fetchPolicies" />
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import type { ColumnDef } from '@tanstack/vue-table'
import { AppButton, AppCard, AppInput } from '@/components/app'
import { AppDataTable, useDataTable } from '@/components/app/data-table'
import { h, computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { $api } = useNuxtApp()
const message = useMessage()
const dialog = useDialog()

interface PolicyRow {
  name: string
  content: string | object
}

const data = ref<PolicyRow[]>([])
const loading = ref(false)
const searchTerm = ref('')

const handleEdit = (row: PolicyRow) => {
  current.value = { ...row }
}

const confirmDelete = (row: PolicyRow) => {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete this policy?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: () => deleteItem(row),
  })
}

const columns: ColumnDef<PolicyRow>[] = [
  {
    accessorKey: 'name',
    header: () => t('Name'),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
    filterFn: 'includesString',
  },
  {
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) =>
      h('div', { class: 'flex justify-center gap-2' }, [
        h(
          AppButton,
          {
            variant: 'outline',
            size: 'sm',
            onClick: () => handleEdit(row.original),
          },
          () => [h(Icon, { name: 'ri:edit-2-line', class: 'size-4' }), h('span', t('Edit'))]
        ),
        h(
          AppButton,
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

const { table } = useDataTable<PolicyRow>({
  data,
  columns,
  getRowId: row => row.name,
})

watch(searchTerm, value => {
  table.getColumn('name')?.setFilterValue(value || undefined)
})

const current = ref<PolicyRow | null>(null)
const showPolicyForm = computed({
  get: () => !!current.value,
  set: value => {
    if (!value) current.value = null
  },
})

const handleNew = () => {
  current.value = {
    name: '',
    content: '{}',
  }
}

const listPolicies = async () => {
  loading.value = true
  try {
    const res = await $api.get('/list-canned-policies')
    data.value = Object.keys(res)
      .sort((a, b) => a.localeCompare(b))
      .map(key => ({
        name: key,
        content: res[key],
      }))
  } catch (error) {
    console.error(error)
    message.error(t('Failed to fetch data'))
  } finally {
    loading.value = false
  }
}

const fetchPolicies = () => listPolicies()

async function deleteItem(row: PolicyRow) {
  try {
    await $api.delete(`/remove-canned-policy?name=${encodeURIComponent(row.name)}`)
    message.success(t('Delete Success'))
    await listPolicies()
  } catch (error) {
    console.error(error)
    message.error(t('Delete Failed'))
  }
}

onMounted(listPolicies)
</script>
