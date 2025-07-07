// icons: https://icones.js.org/collection/ri
export default [
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
    label: "Performance",
    to: "/performance",
    icon: "ri:bar-chart-box-line",
  },
  // {
  //   label: 'Site Replication',
  //   to: '/site-replication',
  //   icon: 'ri:upload-cloud-2-line',
  // },
  {
    label: "Bucket Setting",
    icon: "ri:settings-2-line",
    children: [
      {
        label: "Bucket Events",
        to: "/events",
        icon: "ri:broadcast-line",
      },
      {
        label: "Bucket Replication",
        to: "/replication",
        icon: "ri:file-copy-line",
      },

      {
        label: "Lifecycle",
        to: "/lifecycle",
        icon: "ri:exchange-2-line",
      },
    ],
  },

  {
    label: "divider",
    key: "divider-1",
    type: "divider",
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
    label: "divider",
    key: "divider-2",
    type: "divider",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: "ri:settings-3-line",
  },
  {
    label: "License",
    // to: 'https://github.com/rustfs/rustfs?tab=Apache-2.0-1-ov-file#readme',
    to: "/licenseinfo",
    icon: "ri:copyright-line",
  },
  {
    label: "Documentation",
    to: "https://rustfs.com/docs/",
    target: "_blank",
    icon: "ri:file-list-3-line",
  },
];
