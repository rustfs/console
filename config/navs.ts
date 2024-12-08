
// icons: https://icones.js.org/collection/ri
export default [
  {
    label: 'Home',
    to: '/',
    icon: 'ri:home-2-line',
  },
  {
    label: 'Data',
    icon: 'ri:file-user-line',
    children: [
      {
        label: 'Object Browser',
        to: '/browser',
        icon: 'ri:box-3-line',
      },
      {
        label: 'Buckets',
        to: '/buckets',
        icon: 'ri:archive-drawer-line',
      },
    ],
  },
  {
    label: 'Authentication',
    icon: 'ri:door-lock-box-line',
    children: [
      {
        label: 'Access keys',
        to: '/access-keys',
        icon: 'ri:door-lock-line',
      },
      {
        label: 'Policies',
        to: '/policies',
        icon: 'ri:shield-check-fill',
      },
      {
        label: 'Users',
        to: '/users',
        icon: 'ri:file-user-line',
      },
      {
        label: 'Events',
        to: '/events',
        icon: 'ri:broadcast-line',
      },
      {
        label: 'Configuration',
        to: '/configuration',
        icon: 'ri:settings-2-line',
      },
    ]
  },
  {
    label: 'Info',
    icon: 'ri:settings-2-line',
    children: [
      {
        label: 'Performance',
        to: '/performance',
        icon: 'ri:bar-chart-box-line'
      },
      {
        label: 'License',
        to: '/license',
        icon: 'ri:copyright-line'
      },
      {
        label: 'Documentation',
        to: '/docs',
        icon: 'ri:file-list-3-line'
      }
    ]
  }
]
