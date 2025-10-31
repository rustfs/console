<template>
  <Modal v-model="visible" :title="t('Batch allocation policies')" size="xl" :close-on-backdrop="false">
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="w-full sm:max-w-xs">
          <SearchInput v-model="searchTerm" :placeholder="t('Search Policy')" clearable class="w-full" />
        </div>
        <Button variant="outline" :disabled="!checkedKeys.length || submitting" @click="changePolicies">
          {{ t('Submit') }}
        </Button>
      </div>

      <DataTable :table="table" />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { ColumnDef } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '~/components/modal.vue'

const { listPolicies, setUserOrGroupPolicy } = usePolicies()
const { t } = useI18n()
const message = useMessage()

const props = defineProps<{
  checkedKeys: string[]
}>()

const emit = defineEmits<{
  (e: 'changePoliciesSuccess'): void
}>()

const visible = ref(false)
const searchTerm = ref('')
const submitting = ref(false)
const policies = ref<{ name: string; content: unknown }[]>([])
const checkedKeys = ref<string[]>([])

const filteredPolicies = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return policies.value
  return policies.value.filter(policy => policy.name.toLowerCase().includes(keyword))
})

const allVisibleSelected = computed(() => {
  const visibleNames = filteredPolicies.value.map(item => item.name)
  if (!visibleNames.length) return false
  return visibleNames.every(name => checkedKeys.value.includes(name))
})

const isSelected = (name: string) => checkedKeys.value.includes(name)

const toggleSelection = (name: string, checked: boolean) => {
  if (checked) {
    if (!checkedKeys.value.includes(name)) {
      checkedKeys.value = [...checkedKeys.value, name]
    }
  } else {
    checkedKeys.value = checkedKeys.value.filter(item => item !== name)
  }
}

const toggleSelectAll = (checked: boolean) => {
  const visibleNames = filteredPolicies.value.map(item => item.name)
  if (!visibleNames.length) return
  if (checked) {
    const merged = new Set([...checkedKeys.value, ...visibleNames])
    checkedKeys.value = Array.from(merged)
  } else {
    checkedKeys.value = checkedKeys.value.filter(name => !visibleNames.includes(name))
  }
}

const columns: ColumnDef<{ name: string; content: unknown }>[] = [
  {
    id: 'select',
    header: () =>
      h(Checkbox, {
        checked: allVisibleSelected.value,
        indeterminate: checkedKeys.value.length > 0 && !allVisibleSelected.value,
        onUpdateChecked: (value: boolean | 'indeterminate') => toggleSelectAll(value === true),
      }),
    enableSorting: false,
    cell: ({ row }) =>
      h(Checkbox, {
        checked: isSelected(row.original.name),
        onUpdateChecked: (value: boolean | 'indeterminate') => toggleSelection(row.original.name, value === true),
      }),
    meta: { maxWidth: '3rem' },
  },
  {
    id: 'name',
    header: () => t('Name'),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
    filterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true
      return row.original.name.toLowerCase().includes(String(filterValue).toLowerCase())
    },
  },
]

const { table } = useDataTable<{ name: string; content: unknown }>({
  data: filteredPolicies,
  columns,
  getRowId: row => row.name,
})

watch(searchTerm, value => {
  table.getColumn('name')?.setFilterValue(value || undefined)
})

const loadPolicies = async () => {
  try {
    const res = await listPolicies()
    policies.value = Object.keys(res ?? {})
      .sort((a, b) => a.localeCompare(b))
      .map(key => ({
        name: key,
        content: res[key],
      }))
  } catch (error) {
    message.error(t('Failed to get data'))
  }
}

const openDialog = async () => {
  visible.value = true
  checkedKeys.value = []
  searchTerm.value = ''
  await loadPolicies()
}

const changePolicies = async () => {
  if (!checkedKeys.value.length) return
  submitting.value = true
  try {
    await Promise.all(
      props.checkedKeys.map(item =>
        setUserOrGroupPolicy({
          policyName: checkedKeys.value,
          userOrGroup: item,
          isGroup: true,
        })
      )
    )
    message.success(t('Edit Success'))
    visible.value = false
    emit('changePoliciesSuccess')
  } catch (error) {
    message.error(t('Edit Failed'))
  } finally {
    submitting.value = false
  }
}

defineExpose({
  openDialog,
})
</script>
