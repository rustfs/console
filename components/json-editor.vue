<script setup>
import JsonEditorVue from "json-editor-vue"
import "vanilla-jsoneditor/themes/jse-theme-dark.css"
// import { createAjvValidator } from 'svelte-jsoneditor'

// const validator = createAjvValidator({ schema, schemaDefinitions })
const attrs = useAttrs()
const model = defineModel()
// const value = ref(model.value)
// 监听model变化
watch(
  model,
  (newValue) => {
    model.value = JSON.stringify(JSON.parse(newValue), null, 2)
    // value.value = JSON.stringify(JSON.parse(newValue), null, 2)
  },
  {
    deep: true,
    immediate: true,
  }
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
      class="editor w-full jse-theme-dark" />
  </div>
</template>
<style scoped>
:deep(.jse-main) {
  max-height: 800px;
  min-height: 300px;
}
.editor {
  overflow: hidden;
}
</style>
