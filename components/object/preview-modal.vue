<template>
  <n-modal :show="show" @update:show="(val: boolean) => $emit('update:show', val)" size="huge">
    <n-card class="max-w-screen-md">
      <template #header>
        <div class="flex items-center justify-between gap-4 truncate">
          <div>
            {{ t('Preview Content') }} <small class="text-gray-300">{{ objectKey }}</small>
          </div>
          <n-button type="default" size="small" ghost @click="closeModal">
            <Icon name="ri:close-line" class="mr-2" />
            <span>{{ t('Close') }}</span>
          </n-button>
        </div>
      </template>
      <n-spin v-if="loading" size="large"></n-spin>
      <div v-else class="min-h-64 max-h-[80vh] overflow-y-auto flex-1 flex flex-col items-center" :class="{ 'justify-center': !canPreview }">
        <template v-if="canPreview">
          <img v-if="isImage" :src="previewUrl" alt="preview" />
          <iframe v-else-if="isPdf" :src="previewUrl" class="w-full min-h-[70vh]" frameborder="0"></iframe>
          <pre v-else-if="isText" class="w-full selea">{{ fileContent }}</pre>
          <video v-else-if="isVideo" controls class="w-full">
            <source :src="previewUrl" type="video/mp4" />
            {{ t('Your browser does not support the video tag') }}
          </video>
          <audio v-else-if="isAudio" controls class="w-full">
            <source :src="previewUrl" type="audio/mpeg" />
            {{ t('Your browser does not support the audio tag') }}
          </audio>
        </template>
        <div v-else class="text-center text-gray-500 min-h-full">
          {{ t('Cannot Preview', { contentType: contentType }) }}
        </div>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
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

// 文件类型配置
const fileTypeConfig = {
  text: {
    mimes: [
      'application/json', 'application/xml',
      'application/javascript', 'application/x-sh',
      'application/x-csh', 'application/x-python',
      'application/x-php', 'application/x-perl',
      'application/x-shellscript', 'application/x-ruby',
      'application/x-java', 'application/x-cpp',
    ],
    extensions: [
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
  },
  image: {
    extensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
    ]
  },
  audio: {
    extensions: [
      '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma',
    ]
  },
  pdf: {
    extensions: [
      '.pdf',
    ]
  }
};

// 文件类型判断函数
function isFileType(contentType: string | undefined, fileName: string, type: keyof typeof fileTypeConfig): boolean {
  if (type === 'text') {
    return contentType?.startsWith('text/') ||
      fileTypeConfig.text.mimes.some(mime => contentType?.includes(mime)) ||
      fileTypeConfig.text.extensions.some(ext => fileName.endsWith(ext));
  }

  if (type === 'image') {
    return contentType?.startsWith('image/') ||
      fileTypeConfig.image.extensions.some(ext => fileName.endsWith(ext));
  }

  if (type === 'audio') {
    return contentType?.startsWith('audio/') ||
      fileTypeConfig.audio.extensions.some(ext => fileName.endsWith(ext));
  }

  if (type === 'pdf') {
    return contentType === 'application/pdf' ||
      fileTypeConfig.pdf.extensions.some(ext => fileName.endsWith(ext));
  }

  return false;
}

// 使用新的判断函数
const isImage = computed(() => isFileType(contentType.value, props.objectKey, 'image'));
const isVideo = computed(() => contentType.value?.startsWith('video/') || false);
const isAudio = computed(() => isFileType(contentType.value, props.objectKey, 'audio'));
const isPdf = computed(() => isFileType(contentType.value, props.objectKey, 'pdf'));
const isText = computed(() => isFileType(contentType.value, props.objectKey, 'text'));

const canPreview = computed(() => isImage.value || isPdf.value || isText.value || isVideo.value || isAudio.value);

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
    const url = await getSignedUrl(props.objectKey)

    previewUrl.value = url

    // 先使用 HEAD 请求获取 Content-Type
    const response = await headObject(props.objectKey)

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
    message.error(t('Preview Failed'))
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
