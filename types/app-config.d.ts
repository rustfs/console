export interface NavItem {
  label: string
  to?: string
  type?: string
  icon?: string
  target?: string
  key?: string
  children?: NavItem[]
}
