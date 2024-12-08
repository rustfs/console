import navs from '~/config/navs'

export default defineAppConfig({
  navs: navs,
  name: process.env.APP_NAME || 'RustFS',
  description: process.env.APP_DESCRIPTION || 'RustFS is a distributed file system written in Rust.',
})
