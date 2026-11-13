import type { NavItem } from "@/types/app-config"
import { getThemeManifest } from "@/lib/theme/manifest"

const theme = getThemeManifest()

// icons: https://icones.js.org/collection/ri
export default [
  {
    label: "Data Management",
    type: "divider",
  },
  {
    key: "buckets",
    label: "Buckets",
    to: "/browser",
    icon: "ri:box-3-line",
  },
  {
    label: "Tiered Storage",
    to: "/tiers",
    icon: "ri:stack-line",
  },
  {
    label: "Event Destinations",
    to: "/events-target",
    icon: "ri:bookmark-3-line",
  },
  {
    label: "S3 Tables",
    to: "/table-catalog",
    icon: "ri:table-line",
  },
  {
    label: "Identity",
    type: "divider",
  },
  {
    label: "Access Keys",
    to: "/access-keys",
    icon: "ri:door-lock-line",
  },
  {
    label: "Policies",
    to: "/policies",
    icon: "ri:shield-check-line",
  },
  {
    label: "User Groups",
    to: "/user-groups",
    icon: "ri:group-line",
  },
  {
    label: "Users",
    to: "/users",
    icon: "ri:file-user-line",
  },
  {
    label: "Import/Export",
    to: "/import-export",
    icon: "ri:download-2-line",
  },
  {
    label: "OIDC Settings",
    to: "/oidc",
    icon: "ri:fingerprint-line",
  },
  {
    label: "Cluster Management",
    type: "divider",
  },
  {
    label: "Pool Management",
    icon: "ri:stack-line",
    children: [
      { label: "Rebalance", to: "/rebalance", icon: "ri:refresh-line" },
      { label: "Decommission", to: "/pool-decommission", icon: "ri:delete-bin-5-line" },
    ],
  },
  {
    label: "Site Replication",
    to: "/site-replication",
    icon: "ri:upload-cloud-2-line",
  },
  {
    label: "Security and Compliance",
    type: "divider",
  },
  {
    label: "Encryption & Keys",
    to: "/sse",
    icon: "ri:secure-payment-line",
  },
  {
    label: "Audit Targets",
    to: "/audit-target",
    icon: "ri:file-shield-2-line",
  },
  {
    label: "Operations",
    type: "divider",
  },
  {
    label: "Running Status",
    to: "/status",
    icon: "ri:bar-chart-box-line",
  },
  {
    label: "Administration",
    type: "divider",
  },
  {
    label: "System Setting",
    to: "/settings",
    icon: "ri:settings-line",
  },
  {
    label: "License",
    to: "/license",
    icon: "ri:copyright-line",
  },
] as NavItem[]

export const footerNavs: NavItem[] = [
  {
    label: "Documentation",
    to: theme.links.documentation ?? "https://docs.rustfs.com/?ref=console",
    target: "_blank",
    icon: "ri:file-list-3-line",
  },
]
