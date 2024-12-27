// icons: https://icones.js.org/collection/ri
export default [
  {
    label: '首页',
    to: '/',
    icon: 'ri:home-2-line',
  },
  {
    label: '数据',
    icon: 'ri:file-user-line',
    children: [
      {
        label: '对象浏览器',
        to: '/browser',
        icon: 'ri:box-3-line',
      },
      {
        label: '存储桶',
        to: '/buckets',
        icon: 'ri:archive-drawer-line',
      },
      {
        label: '访问密钥',
        to: '/access-keys',
        icon: 'ri:door-lock-line',
      },
      {
        label: '策略',
        to: '/policies',
        icon: 'ri:shield-check-fill',
      },
      {
        label: '用户',
        to: '/users',
        icon: 'ri:file-user-line',
      },
      // {
      //   label: '事件',
      //   to: '/events',
      //   icon: 'ri:broadcast-line',
      // },
      // {
      //   label: '配置',
      //   to: '/configuration',
      //   icon: 'ri:settings-2-line',
      // },
    ]
  },
  {
    label: '信息',
    icon: 'ri:settings-2-line',
    children: [
      {
        label: '性能',
        to: '/performance',
        icon: 'ri:bar-chart-box-line'
      },
      {
        label: '许可证',
        to: 'https://github.com/rustfs/rustfs?tab=Apache-2.0-1-ov-file#readme',
        icon: 'ri:copyright-line'
      },
      {
        label: '文档',
        to: 'https://rustfs.com/docs/',
        icon: 'ri:file-list-3-line'
      }
    ]
  }
]
