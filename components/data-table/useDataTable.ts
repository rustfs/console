import { Checkbox } from '@/components/ui/checkbox'
import { valueUpdater } from '@/lib/utils'
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowData,
  RowSelectionState,
  SortingState,
  TableOptions,
} from '@tanstack/vue-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import type { MaybeRefOrGetter } from 'vue'
import { computed, h, reactive, ref, toValue, type Ref } from 'vue'

export interface UseDataTableOptions<TData extends RowData> {
  data: MaybeRefOrGetter<TData[]>
  columns: MaybeRefOrGetter<ColumnDef<TData, any>[]>
  pageSize?: number
  manualPagination?: boolean
  manualSorting?: boolean
  getRowId?: TableOptions<TData>['getRowId']
  /**
   * Whether to enable row selection (will automatically add selection column)
   * @default false
   */
  enableRowSelection?: boolean
}

export interface UseDataTableReturn<TData extends RowData> {
  /** TanStack Table instance providing all table operations */
  table: ReturnType<typeof useVueTable<TData>>
  /** Array of selected row data (reactive) */
  selectedRows: Ref<TData[]>
  /** Array of selected row IDs (reactive, requires getRowId) */
  selectedRowIds: Ref<string[]>
}

/**
 * Create selection column (implemented according to shadcn-vue official docs)
 * Reference: https://www.shadcn-vue.com/docs/components/data-table.html#row-selection
 *
 * Key: reka-ui Checkbox uses modelValue/onUpdate:modelValue instead of checked/onUpdate:checked
 */
function createSelectColumn<TData extends RowData>(): ColumnDef<TData> {
  return {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => {
      return h(Checkbox, {
        modelValue: table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
        ariaLabel: 'Select all',
        class: 'translate-y-0.5',
      })
    },
    cell: ({ row }) => {
      return h(Checkbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        ariaLabel: 'Select row',
        class: 'translate-y-0.5',
      })
    },
    size: 48,
  }
}

export function useDataTable<TData extends RowData>(options: UseDataTableOptions<TData>): UseDataTableReturn<TData> {
  const sorting = ref<SortingState>([])
  const columnFilters = ref<ColumnFiltersState>([])
  const rowSelection = ref<RowSelectionState>({})
  const pagination = ref<PaginationState>({
    pageIndex: 0,
    pageSize: options.pageSize ?? 10,
  })

  const dataRef = computed(() => toValue(options.data))

  // If row selection is enabled, automatically prepend selection column to column definitions
  const columnsRef = computed(() => {
    const baseColumns = toValue(options.columns)

    if (options.enableRowSelection) {
      return [createSelectColumn<TData>(), ...baseColumns]
    }

    return baseColumns
  })

  const table = useVueTable({
    data: dataRef,
    get columns() {
      return columnsRef.value
    },
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
    enableRowSelection: options.enableRowSelection ?? false,
    manualSorting: options.manualSorting ?? false,
    manualPagination: options.manualPagination ?? false,
    getRowId: options.getRowId,
    onSortingChange: updater => valueUpdater(updater, sorting),
    onColumnFiltersChange: updater => valueUpdater(updater, columnFilters),
    onRowSelectionChange: updater => valueUpdater(updater, rowSelection),
    onPaginationChange: updater => valueUpdater(updater, pagination),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: options.manualPagination ? undefined : getPaginationRowModel(),
  })

  // Compute selected row data (reactive)
  const selectedRows = computed(() => {
    return table.getSelectedRowModel().rows.map(row => row.original)
  })

  // Compute selected row IDs (reactive)
  const selectedRowIds = computed(() => {
    return table.getSelectedRowModel().rows.map(row => row.id)
  })

  return {
    table,
    selectedRows,
    selectedRowIds,
  }
}
