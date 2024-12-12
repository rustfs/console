<script setup>
import JsonEditorVue from 'json-editor-vue'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
// import { createAjvValidator } from 'svelte-jsoneditor'

// const validator = createAjvValidator({ schema, schemaDefinitions })
const attrs = useAttrs()
</script>

<template>
  <!-- :validator="validator" 验证器 -->
  <div class="w-full">
    <JsonEditorVue
      v-bind="attrs"
      mode="text"
      :mainMenuBar="false"
      selection="TextSelection"
      class="w-full jse-theme-dark" />
  </div>
</template>
<style scoped>
:deep(.jse-main) {
  max-height: 800px;
  min-height: 300px;
}
</style>
