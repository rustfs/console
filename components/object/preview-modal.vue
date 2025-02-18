<template>
  <n-modal :show="show" @update:show="val => $emit('update:show', val)" size="huge">
    <n-card class="max-w-screen-md">
      <template #header>
        <div class="flex items-center justify-between gap-4 truncate">
          <div>
            预览内容 <small class="text-gray-300">{{ objectKey }}</small>
          </div>
          <n-button type="default" size="small" ghost @click="closeModal">
            <Icon name="ri:close-line" class="mr-2" />
            <span>关闭</span>
          </n-button>
        </div>
      </template>
      <n-spin v-if="loading" size="large"></n-spin>
      <div v-else class="min-h-64 max-h-[80vh] overflow-y-auto flex-1 flex flex-col items-center">
        <template v-if="canPreview">
          <img v-if="isImage" :src="previewUrl" alt="preview" />
          <iframe v-else-if="isPdf" :src="previewUrl" class="w-full min-h-[70vh]" frameborder="0"></iframe>
          <pre v-else-if="isText" class="w-full selea">{{ fileContent }}</pre>
          <video v-else-if="isVideo" controls class="w-full">
            <source :src="previewUrl" type="video/mp4" />
            您的浏览器不支持 video 标签
          </video>
          <audio v-else-if="isAudio" controls class="w-full">
            <source :src="previewUrl" type="audio/mpeg" />
            您的浏览器不支持 audio 标签
          </audio>
        </template>
        <div v-else class="text-center text-gray-500">
          无法预览该对象的内容（MIME类型：{{ contentType }}），请下载查看
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
  bucketName: string
  objectKey: string
}>()

const emit = defineEmits(['update:show'])
const { getSignedUrl, headObject } = useObject({ bucket: props.bucketName })

// 内部状态
const previewUrl = ref<string | undefined>(undefined)
const contentType = ref<string | undefined>(undefined)
const fileContent = ref<string | undefined>(undefined)
const loading = ref<boolean>(false)

const message = useMessage()

const textMimes = [
  'application/json', 'application/xml',
  'application/javascript', 'application/x-sh',
  'application/x-csh', 'application/x-python',
  'application/x-php', 'application/x-perl',
  'application/x-shellscript', 'application/x-ruby',
  'application/x-java', 'application/x-cpp',
]

const textExtensions = [
  '.txt', '.json', '.xml', '.js', '.sh', '.csh',
  '.py', '.php', '.pl', '.sh', '.rb', '.java',
  '.cpp', '.h', '.hpp', '.c', '.cc', '.hh',
  '.hxx', '.cxx', '.java', '.kt', '.scala',
  '.groovy', '.rs', '.go', '.dart', '.swift',
  '.m', '.mm', '.cs', '.ts', '.jsx', '.tsx',
  '.html', '.htm', '.css', '.scss', '.sass',
  '.less', '.styl', '.yaml', '.yml', '.toml',
  '.ini', '.cfg', '.conf', '.properties', '.md',
  '.markdown', '.rst', '.r',
]

const imageExtensions = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
]

const audioExtensions = [
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma',
]

const pdfExtensions = [
  '.pdf',
]

// MIME 类型判断逻辑
const isImage = computed(() => {
  return contentType.value?.startsWith('image/') || imageExtensions.some(ext => props.objectKey.endsWith(ext))
})
const isVideo = computed(() => contentType.value?.startsWith('video/') || false)
const isAudio = computed(() => {
  return contentType.value?.startsWith('audio/') || audioExtensions.some(ext => props.objectKey.endsWith(ext))
})
const isPdf = computed(() => {
  return contentType.value === 'application/pdf' || pdfExtensions.some(ext => props.objectKey.endsWith(ext))
})
const isText = computed(() => {
  // 常见文本类型，可按需扩展
  return contentType.value?.startsWith('text/') || textMimes.some(mime => contentType.value?.includes(mime)) ||
    textExtensions.some(ext => props.objectKey.endsWith(ext))
})

const canPreview = computed(() => isImage.value || isPdf.value || isText.value || isVideo.value || isAudio.value)

// 当 show 为 true 时触发加载逻辑
watch(() => props.show, async (newVal) => {
  if (newVal) {
    await loadPreview()
  } else {
    resetState()
  }
})

async function loadPreview() {
  loading.value = true
  previewUrl.value = undefined
  fileContent.value = undefined
  contentType.value = undefined

  try {
    // 获取预签名URL
    const url = await getSignedUrl(objectKey.value)

    previewUrl.value = url

    // 先使用 HEAD 请求获取 Content-Type
    const response = await headObject(objectKey.value)

    const ctype = response?.ContentType
    contentType.value = ctype || 'application/octet-stream'

    // 根据 MIME 类型决定是否加载内容
    if (isText.value) {
      // 加载文本内容
      const response = await fetch(url)
      const text = await response.text()
      fileContent.value = text
    }

  } catch (err) {
    console.error(err)
    message.error('获取对象预览失败')
    closeModal()
  } finally {
    loading.value = false
  }
}

function resetState() {
  previewUrl.value = undefined
  fileContent.value = undefined
  contentType.value = undefined
  loading.value = false
}

function closeModal() {
  emit('update:show', false)
}

const objectKey = computed(() => props.objectKey)
</script>
