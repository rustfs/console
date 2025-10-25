<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table'
import AppButton from '@/components/app/AppButton.vue'
import AppSelect from '@/components/app/AppSelect.vue'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    table: Table<TData>
    pageSizeOptions?: number[]
    class?: string
  }>(),
  {
    pageSizeOptions: () => [10, 20, 50, 100],
    class: undefined,
  }
)

const pagination = computed(() => props.table.getState().pagination)
const currentPage = computed(() => pagination.value.pageIndex + 1)
const pageCount = computed(() => props.table.getPageCount())
const canPrevious = computed(() => props.table.getCanPreviousPage())
const canNext = computed(() => props.table.getCanNextPage())

const handlePageSizeChange = (value: number | string | boolean | null) => {
  if (typeof value === 'number') {
    props.table.setPageSize(value)
  } else if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) {
      props.table.setPageSize(parsed)
    }
  }
}
</script>

<template>
  <div :class="cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', props.class)">
    <div class="flex items-center gap-3">
      <span class="text-sm text-muted-foreground">
        Rows per page
      </span>
      <AppSelect
        :options="pageSizeOptions.map(option => ({ label: String(option), value: option }))"
        :model-value="pagination.pageSize"
        class="w-24"
        @update:model-value="handlePageSizeChange"
      />
    </div>

    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">
        Page {{ pageCount === 0 ? 0 : currentPage }} of {{ pageCount }}
      </span>
      <div class="flex items-center gap-2">
        <AppButton variant="outline" size="sm" :disabled="!canPrevious" @click="props.table.setPageIndex(0)">
          First
        </AppButton>
        <AppButton variant="outline" size="sm" :disabled="!canPrevious" @click="props.table.previousPage()">
          Prev
        </AppButton>
        <AppButton variant="outline" size="sm" :disabled="!canNext" @click="props.table.nextPage()">
          Next
        </AppButton>
        <AppButton
          variant="outline"
          size="sm"
          :disabled="!canNext"
          @click="props.table.setPageIndex(Math.max(pageCount - 1, 0))"
        >
          Last
        </AppButton>
      </div>
    </div>
  </div>
</template>
