<script setup lang="ts" generic="TData">
import EmptyState from '@/components/empty-state.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table as UiTable } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Column, Table } from '@tanstack/vue-table'
import { FlexRender } from '@tanstack/vue-table'
import { computed } from 'vue'
import { Icon } from '#components'

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
  const meta = column.columnDef.meta
  if (!meta) return undefined

  const styles: Record<string, string> = {}

  if (meta.width != null) {
    styles.width = typeof meta.width === 'number' ? `${meta.width}px` : meta.width
  }
  if (meta.minWidth != null) {
    styles.minWidth = typeof meta.minWidth === 'number' ? `${meta.minWidth}px` : meta.minWidth
  }
  if (meta.maxWidth != null) {
    styles.maxWidth = typeof meta.maxWidth === 'number' ? `${meta.maxWidth}px` : meta.maxWidth
  }

  return Object.keys(styles).length > 0 ? styles : undefined
}

const canSort = (column: Column<TData, unknown>) => {
  const def = column.columnDef as any
  // 如果 enableSorting 明确设置为 false，则不显示排序
  if (def.enableSorting === false) {
    return false
  }

  // 直接检查列定义对象中是否真的存在 accessorKey 或 accessorFn
  // 使用 Object.prototype.hasOwnProperty.call 来确保属性直接存在于对象上
  const hasAccessorKey =
    Object.prototype.hasOwnProperty.call(def, 'accessorKey') &&
    typeof def.accessorKey === 'string' &&
    def.accessorKey.length > 0

  const hasAccessorFn = Object.prototype.hasOwnProperty.call(def, 'accessorFn') && typeof def.accessorFn === 'function'

  // 只有明确配置了 accessorKey 或 accessorFn 时才显示排序
  return hasAccessorKey || hasAccessorFn
}
</script>

<template>
  <div :class="cn('flex flex-col gap-4', props.class)">
    <component
      :is="bodyHeight ? ScrollArea : 'div'"
      :class="bodyHeight ? cn('rounded-md border', bodyHeight) : undefined"
    >
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
              <template v-if="!header.isPlaceholder">
                <div
                  v-if="canSort(header.column)"
                  class="flex items-center gap-2 cursor-pointer select-none hover:text-foreground"
                  @click="header.column.getToggleSortingHandler()?.($event)"
                >
                  <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
                  <Icon v-if="header.column.getIsSorted() === 'asc'" name="ri:arrow-up-s-line" class="size-4" />
                  <Icon v-else-if="header.column.getIsSorted() === 'desc'" name="ri:arrow-down-s-line" class="size-4" />
                  <Icon v-else name="ri:arrow-up-down-line" class="size-4 text-muted-foreground opacity-50" />
                </div>
                <FlexRender v-else :render="header.column.columnDef.header" :props="header.getContext()" />
              </template>
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
