<script setup>
import JsonEditorVue from 'json-editor-vue'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import { useI18n } from 'vue-i18n'
// import { createAjvValidator } from 'svelte-jsoneditor'

// const validator = createAjvValidator({ schema, schemaDefinitions })
const { t } = useI18n()
const attrs = useAttrs()
const model = defineModel()

watch(
  model,
  newValue => {
    if (typeof newValue !== 'string') return
    const trimmed = newValue.trim()
    if (!trimmed) return
    try {
      const formatted = JSON.stringify(JSON.parse(trimmed), null, 2)
      if (formatted !== newValue) {
        model.value = formatted
      }
    } catch {
      // Swallow parse errors so the editor stays usable while typing
    }
  },
  { immediate: true }
)
</script>

<template>
  <!-- :validator="validator" 验证器 -->
  <div class="w-full">
    <JsonEditorVue
      v-bind="attrs"
      mode="text"
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
