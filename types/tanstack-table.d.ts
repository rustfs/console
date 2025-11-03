import type { RowData } from '@tanstack/vue-table'

declare module '@tanstack/vue-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    width?: string | number
    minWidth?: string | number
    maxWidth?: string | number
  }
}
