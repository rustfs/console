<script setup lang="ts" generic="TData">
import { Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'
import type { Table } from '@tanstack/vue-table'
import { computed } from 'vue'
import Selector from '~/components/selector.vue'

const { t } = useI18n()

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
        {{ t('Rows per page') }}
      </span>
      <Selector
        :options="pageSizeOptions.map(option => ({ label: String(option), value: option }))"
        :model-value="pagination.pageSize"
        class="w-24"
        @update:model-value="handlePageSizeChange"
      />
    </div>

    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">
        {{ t('Page {current} of {total}', { current: pageCount === 0 ? 0 : currentPage, total: pageCount }) }}
      </span>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" :disabled="!canPrevious" @click="props.table.setPageIndex(0)">
          {{ t('First') }}
        </Button>
        <Button variant="outline" size="sm" :disabled="!canPrevious" @click="props.table.previousPage()">
          {{ t('Prev') }}
        </Button>
        <Button variant="outline" size="sm" :disabled="!canNext" @click="props.table.nextPage()">
          {{ t('Next') }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="!canNext"
          @click="props.table.setPageIndex(Math.max(pageCount - 1, 0))"
        >
          {{ t('Last') }}
        </Button>
      </div>
    </div>
  </div>
</template>
