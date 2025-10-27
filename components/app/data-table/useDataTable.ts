import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowData,
  RowSelectionState,
  SortingState,
  TableOptions,
  Updater,
} from '@tanstack/vue-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import type { MaybeRefOrGetter } from 'vue'
import { computed, reactive, ref, toValue, watch, type Ref } from 'vue'

export interface UseDataTableOptions<TData extends RowData> {
  data: MaybeRefOrGetter<TData[]>
  columns: MaybeRefOrGetter<ColumnDef<TData, any>[]>
  pageSize?: number
  manualPagination?: boolean
  manualSorting?: boolean
  getRowId?: TableOptions<TData>['getRowId']
}

export interface UseDataTableReturn<TData extends RowData> {
  table: ReturnType<typeof useVueTable<TData>>
  sorting: Ref<SortingState>
  columnFilters: Ref<ColumnFiltersState>
  rowSelection: Ref<RowSelectionState>
  pagination: Ref<PaginationState>
  setSorting: (updater: Updater<SortingState>) => void
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void
  setRowSelection: (updater: Updater<RowSelectionState>) => void
  setPagination: (updater: Updater<PaginationState>) => void
  resetSorting: () => void
  resetFilters: () => void
  resetRowSelection: () => void
}

const applyUpdater = <TState>(updater: Updater<TState>, previous: TState): TState => {
  return typeof updater === 'function' ? (updater as (old: TState) => TState)(previous) : updater
}

export function useDataTable<TData extends RowData>(
  options: UseDataTableOptions<TData>
): UseDataTableReturn<TData> {
  const sorting = ref<SortingState>([])
  const columnFilters = ref<ColumnFiltersState>([])
  const rowSelection = ref<RowSelectionState>({})
  const pagination = ref<PaginationState>({
    pageIndex: 0,
    pageSize: options.pageSize ?? 10,
  })

  const dataRef = computed(() => toValue(options.data))
  const columnsRef = computed(() => toValue(options.columns))

  const table = useVueTable({
    data: dataRef.value,
    columns: columnsRef.value,
    state: reactive({
      get sorting() {
        return sorting.value
      },
      get columnFilters() {
        return columnFilters.value
      },
      get rowSelection() {
        return rowSelection.value
      },
      get pagination() {
        return pagination.value
      },
    }),
    enableSorting: !options.manualSorting,
    manualSorting: options.manualSorting ?? false,
    manualPagination: options.manualPagination ?? false,
    getRowId: options.getRowId,
    onSortingChange: updater => {
      sorting.value = applyUpdater(updater, sorting.value)
    },
    onColumnFiltersChange: updater => {
      columnFilters.value = applyUpdater(updater, columnFilters.value)
    },
    onRowSelectionChange: updater => {
      rowSelection.value = applyUpdater(updater, rowSelection.value)
    },
    onPaginationChange: updater => {
      pagination.value = applyUpdater(updater, pagination.value)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: options.manualPagination ? undefined : getPaginationRowModel(),
  })

  watch(dataRef, value => {
    table.setOptions(prev => ({
      ...prev,
      data: value,
    }))
  })

  watch(columnsRef, value => {
    table.setOptions(prev => ({
      ...prev,
      columns: value,
    }))
  })

  return {
    table,
    sorting,
    columnFilters,
    rowSelection,
    pagination,
    setSorting: updater => {
      sorting.value = applyUpdater(updater, sorting.value)
    },
    setColumnFilters: updater => {
      columnFilters.value = applyUpdater(updater, columnFilters.value)
    },
    setRowSelection: updater => {
      rowSelection.value = applyUpdater(updater, rowSelection.value)
    },
    setPagination: updater => {
      pagination.value = applyUpdater(updater, pagination.value)
    },
    resetSorting: () => {
      sorting.value = []
    },
    resetFilters: () => {
      columnFilters.value = []
    },
    resetRowSelection: () => {
      rowSelection.value = {}
    },
  }
}
