import type { NavItem } from "@/types/app-config"
import { getThemeManifest } from "@/lib/theme/manifest"

const theme = getThemeManifest()

// icons: https://icones.js.org/collection/ri
export default [
  // {
  //   label: "Home",
  //   to: "/",
  //   icon: "ri:home-line",
  // },
  {
    label: "Browser",
    to: "/browser",
    icon: "ri:box-3-line",
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
    label: "Users",
    to: "/users",
    icon: "ri:file-user-line",
  },
  {
    label: "User Groups",
    to: "/user-groups",
    icon: "ri:group-line",
  },
  {
    label: "Import/Export",
    to: "/import-export",
    icon: "ri:download-2-line",
  },
  {
    label: "Running Status",
    to: "/status",
    icon: "ri:bar-chart-box-line",
  },
  {
    label: "divider",
    key: "divider-1",
    type: "divider",
  },
  // {
  //   label: "Bucket Events",
  //   to: "/events",
  //   icon: "ri:broadcast-line",
  // },
  // {
  //   label: "Bucket Replication",
  //   to: "/replication",
  //   icon: "ri:file-copy-line",
  // },
  // {
  //   label: "Lifecycle",
  //   to: "/lifecycle",
  //   icon: "ri:exchange-2-line",
  // },
  // {
  //   label: "Site Replication",
  //   to: "/site-replication",
  //   icon: "ri:upload-cloud-2-line",
  // },
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
    label: "SSE Settings",
    to: "/sse",
    icon: "ri:secure-payment-line",
  },
  {
    label: "OIDC Settings",
    to: "/oidc",
    icon: "ri:fingerprint-line",
  },
  {
    label: "divider",
    key: "divider-2",
    type: "divider",
  },
  {
    label: "License",
    to: "/license",
    icon: "ri:copyright-line",
  },
  {
    label: "Documentation",
    to: theme.links.documentation ?? "https://docs.rustfs.com/",
    target: "_blank",
    icon: "ri:file-list-3-line",
  },
] as NavItem[]
