import type { NavItem } from "@/types/app-config"

// icons: https://icones.js.org/collection/ri
export default [
  {
    label: "Home",
    to: "/",
    icon: "ri:home-line",
  },
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
    isAdminOnly: true,
  },
  {
    label: "Users",
    to: "/users",
    icon: "ri:file-user-line",
    isAdminOnly: true,
  },
  {
    label: "User Groups",
    to: "/user-groups",
    icon: "ri:group-line",
    isAdminOnly: true,
  },
  {
    label: "Import/Export",
    to: "/import-export",
    icon: "ri:download-2-line",
    isAdminOnly: true,
  },
  // {
  //   label: "Performance",
  //   to: "/performance",
  //   icon: "ri:bar-chart-box-line",
  //   isAdminOnly: true,
  // },
  {
    label: "divider",
    key: "divider-1",
    type: "divider",
    isAdminOnly: true,
  },
  // {
  //   label: "Bucket Events",
  //   to: "/events",
  //   icon: "ri:broadcast-line",
  //   isAdminOnly: true,
  // },
  // {
  //   label: "Bucket Replication",
  //   to: "/replication",
  //   icon: "ri:file-copy-line",
  //   isAdminOnly: true,
  // },
  // {
  //   label: "Lifecycle",
  //   to: "/lifecycle",
  //   icon: "ri:exchange-2-line",
  //   isAdminOnly: true,
  // },
  // {
  //   label: "Site Replication",
  //   to: "/site-replication",
  //   icon: "ri:upload-cloud-2-line",
  //   isAdminOnly: true,
  // },
  {
    label: "Tiered Storage",
    to: "/tiers",
    icon: "ri:stack-line",
    isAdminOnly: true,
  },
  {
    label: "Event Destinations",
    to: "/events-target",
    icon: "ri:bookmark-3-line",
    isAdminOnly: true,
  },
  {
    label: "SSE Settings",
    to: "/sse",
    icon: "ri:secure-payment-line",
    isAdminOnly: true,
  },
  {
    label: "divider",
    key: "divider-2",
    type: "divider",
    isAdminOnly: true,
  },
  {
    label: "License",
    to: "/license",
    icon: "ri:copyright-line",
  },
  {
    label: "Documentation",
    to: "https://docs.rustfs.com/",
    target: "_blank",
    icon: "ri:file-list-3-line",
  },
] as NavItem[]
