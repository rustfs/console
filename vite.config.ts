import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { createVitePlugins } from './build/plugins'
import { createViteProxy } from './build/proxy'
// 引入接口环境的地址配置
import { serviceConfig } from './service.config'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 根据当前工作目录中的 `mode` 加载 .env 文件
  const env = loadEnv(mode, __dirname, '') as ImportMetaEnv
  // 获取当前环境的配置地址
  const envConfig = serviceConfig[mode as ServiceEnvType]

  return {
    base: env.VITE_BASE_URL,
    plugins: createVitePlugins(env),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      host: '0.0.0.0',
      proxy:
        env.VITE_HTTP_PROXY === 'Y' ? createViteProxy(envConfig) : undefined,
    },
    build: {
      target: 'esnext',
      reportCompressedSize: false, // 启用/禁用 gzip 压缩大小报告
    },
    // 强制预构建的包
    optimizeDeps: {
      include: ['echarts', 'md-editor-v3', 'quill'],
    },
    css: {
      // 配置预处理器
      preprocessorOptions: {
        scss: {
          // Vite会使用现代的SCSS API模式来处理SCSS文件 例如：@use 替代以前的@import
          api: 'modern',
        },
      },
    },
  }
})