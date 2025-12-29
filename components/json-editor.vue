<script setup lang="ts">
import JsonEditorVue from 'json-editor-vue'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
// import { createAjvValidator } from 'svelte-jsoneditor'

// const validator = createAjvValidator({ schema, schemaDefinitions })
const { t } = useI18n()
const message = useMessage()
const attrs = useAttrs()
const model = defineModel()

const formatJson = () => {
  if (typeof model.value !== 'string') {
    message.error(t('Invalid JSON format'))
    return
  }

  const trimmed = model.value.trim()
  if (!trimmed) {
    message.warning(t('JSON content is empty'))
    return
  }

  try {
    const parsed = JSON.parse(trimmed)
    const formatted = JSON.stringify(parsed, null, 2)
    if (formatted !== model.value) {
      model.value = formatted
      message.success(t('JSON formatted successfully'))
    } else {
      message.info(t('JSON is already formatted'))
    }
  } catch (error) {
    message.error(t('Invalid JSON format'))
  }
}
</script>

<template>
  <!-- :validator="validator" 验证器 -->
  <div class="w-full space-y-2 relative">
    <div class="flex justify-end absolute top-1 right-1 z-30">
      <Button variant="outline" size="sm" @click="formatJson">
        <Icon name="ri:code-s-slash-line" class="size-4" />
        <!-- <span>{{ t('Format') }}</span> -->
      </Button>
    </div>
    <JsonEditorVue
      v-bind="attrs"
      :mode="'text' as any"
      v-model="model"
      :mainMenuBar="false"
      selection="TextSelection"
      class="editor w-full jse-theme-dark"
      :title="t('JSON Editor')"
    />
  </div>
</template>
<style scoped>
:deep(.jse-main) {
  min-height: 200px;
}

.editor {
  overflow: hidden;
}
</style>
