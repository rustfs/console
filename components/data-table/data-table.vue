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
import type { Table } from '@tanstack/vue-table'
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
</script>

<template>
  <div :class="cn('flex flex-col gap-4', props.class)">
    <ScrollArea v-if="bodyHeight" :class="cn('rounded-md border', bodyHeight)">
      <UiTable :class="tableClass">
        <TableHeader :class="stickyHeader ? 'sticky top-0 z-10 bg-muted/40 backdrop-blur' : ''">
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id" :class="stickyHeader ? 'bg-muted/40 backdrop-blur' : undefined">
            <TableHead v-for="header in headerGroup.headers" :key="header.id">
              <template v-if="!header.isPlaceholder">
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
              </template>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading">
            <TableRow>
              <TableCell :colspan="visibleColumnCount" class="h-32 text-center align-middle">
                <div class="flex flex-col items-center gap-2">
                  <Spinner class="size-6" />
                  <span class="text-sm text-muted-foreground">Loading...</span>
                </div>
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="hasRows">
            <TableRow v-for="row in table.getRowModel().rows" :key="row.id" :data-state="row.getIsSelected() ? 'selected' : undefined" class="transition-colors hover:bg-muted/40">
              <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow>
              <TableCell :colspan="visibleColumnCount" class="h-48">
                <EmptyState :title="emptyTitle" :description="emptyDescription">
                  <slot name="empty" />
                </EmptyState>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </UiTable>
    </ScrollArea>

    <template v-else>
      <UiTable :class="cn('border rounded-md', tableClass)">
        <TableHeader>
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead v-for="header in headerGroup.headers" :key="header.id" class="py-2">
              <template v-if="!header.isPlaceholder">
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
              </template>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading">
            <TableRow>
              <TableCell :colspan="visibleColumnCount" class="h-32 text-center align-middle">
                <div class="flex flex-col items-center gap-2">
                  <Spinner class="size-6" />
                  <span class="text-sm text-muted-foreground">Loading...</span>
                </div>
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="hasRows">
            <TableRow v-for="row in table.getRowModel().rows" :key="row.id" :data-state="row.getIsSelected() ? 'selected' : undefined" class="transition-colors hover:bg-muted/40">
              <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="py-2">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow>
              <TableCell :colspan="visibleColumnCount" class="h-48">
                <EmptyState :title="emptyTitle" :description="emptyDescription">
                  <slot name="empty" />
                </EmptyState>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </UiTable>
    </template>
  </div>
</template>
