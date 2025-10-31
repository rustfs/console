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
   * 是否启用行选择功能（会自动添加选择列）
   * @default false
   */
  enableRowSelection?: boolean
}

export interface UseDataTableReturn<TData extends RowData> {
  /** TanStack Table 实例，提供所有表格操作方法 */
  table: ReturnType<typeof useVueTable<TData>>
  /** 选中的行数据数组（响应式） */
  selectedRows: Ref<TData[]>
  /** 选中的行 ID 数组（响应式，需要提供 getRowId） */
  selectedRowIds: Ref<string[]>
}

/**
 * 创建选择列（按照 shadcn-vue 官方文档实现）
 * 参考：https://www.shadcn-vue.com/docs/components/data-table.html#row-selection
 *
 * 关键：reka-ui Checkbox 使用 modelValue/onUpdate:modelValue 而不是 checked/onUpdate:checked
 */
function createSelectColumn<TData extends RowData>(): ColumnDef<TData> {
  return {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => {
      return h(Checkbox, {
        'modelValue': table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Select all',
        'class': 'translate-y-0.5',
      })
    },
    cell: ({ row }) => {
      return h(Checkbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'ariaLabel': 'Select row',
        'class': 'translate-y-0.5',
      })
    },
    size: 48,
  }
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

  // 如果启用了行选择，自动在列定义前添加选择列
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

  // 计算选中的行数据（响应式）
  const selectedRows = computed(() => {
    return table.getSelectedRowModel().rows.map(row => row.original)
  })

  // 计算选中的行 ID（响应式）
  const selectedRowIds = computed(() => {
    return table.getSelectedRowModel().rows.map(row => row.id)
  })

  return {
    table,
    selectedRows,
    selectedRowIds,
  }
}
