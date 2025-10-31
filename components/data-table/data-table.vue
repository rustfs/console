<script setup lang="ts" generic="TData">
import EmptyState from '@/components/empty-state.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table as UiTable,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Column, Table } from '@tanstack/vue-table'
import { FlexRender } from '@tanstack/vue-table'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    table: Table<TData>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
    class?: string
    tableClass?: string
    stickyHeader?: boolean
    bodyHeight?: string
  }>(),
  {
    isLoading: false,
    emptyTitle: 'No data',
    emptyDescription: 'There is nothing to display yet.',
    class: undefined,
    tableClass: undefined,
    stickyHeader: false,
    bodyHeight: undefined,
  }
)

const visibleColumnCount = computed(() => props.table.getVisibleLeafColumns().length)
const hasRows = computed(() => props.table.getRowModel().rows.length > 0)

const getColumnStyles = (column: Column<TData, unknown>) => {
  const maxWidth = column.columnDef.meta?.maxWidth
  if (maxWidth == null) return undefined
  return { maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }
}
</script>

<template>
  <div :class="cn('flex flex-col gap-4', props.class)">
    <component :is="bodyHeight ? ScrollArea : 'div'" :class="bodyHeight ? cn('rounded-md border', bodyHeight) : undefined">
      <UiTable :class="bodyHeight ? tableClass : cn('border rounded-md', tableClass)">
        <!-- Table Header -->
        <TableHeader :class="stickyHeader ? 'sticky top-0 z-10 bg-muted/40 backdrop-blur' : ''">
          <TableRow
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
            :class="stickyHeader ? 'bg-muted/40 backdrop-blur' : undefined"
          >
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              :class="bodyHeight ? undefined : 'py-2'"
              :style="getColumnStyles(header.column)"
            >
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </TableHead>
          </TableRow>
        </TableHeader>

        <!-- Table Body -->
        <TableBody>
          <!-- Loading -->
          <TableRow v-if="isLoading">
            <TableCell :colspan="visibleColumnCount" class="h-48 text-center align-middle">
              <div class="flex flex-col items-center gap-2">
                <Spinner class="size-6" />
                <span class="text-sm text-muted-foreground">Loading...</span>
              </div>
            </TableCell>
          </TableRow>

          <!-- Data Rows -->
          <TableRow
            v-else-if="hasRows"
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            :data-state="row.getIsSelected() ? 'selected' : undefined"
            class="transition-colors hover:bg-muted/40"
          >
            <TableCell
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              :class="bodyHeight ? undefined : 'py-2'"
              :style="getColumnStyles(cell.column)"
            >
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </TableCell>
          </TableRow>

          <!-- Empty State -->
          <TableRow v-else>
            <TableCell :colspan="visibleColumnCount" class="h-48">
              <EmptyState :title="emptyTitle" :description="emptyDescription">
                <slot name="empty" />
              </EmptyState>
            </TableCell>
          </TableRow>
        </TableBody>
      </UiTable>
    </component>
  </div>
</template>
