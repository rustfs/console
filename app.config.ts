import navs from '~/config/navs'
import type { AppConfig } from '~/types/app-config'

export default defineAppConfig<AppConfig>({
  navs: navs,
  name: process.env.APP_NAME || 'RustFS',
  description: process.env.APP_DESCRIPTION || 'RustFS is a distributed file system written in Rust.',
  icon: {
    mode: 'css',
    cssLayer: 'base'
  }
})
