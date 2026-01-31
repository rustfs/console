export interface NavItem {
  label: string
  isAdminOnly?: boolean
  to?: string
  type?: string
  icon?: string
  target?: string
  key?: string
  children?: NavItem[]
}
