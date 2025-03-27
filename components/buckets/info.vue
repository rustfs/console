<template>
 <n-drawer v-model:show="show" :width="502">
    <n-drawer-content :title="`桶配置(${bucketName})`" closable>
      《斯通纳》是美国作家约翰·威廉姆斯在 1965 年出版的小说。
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
  const  show = ref(false)
  const bucketName = ref('')
  const openDrawer = (bucket) => {
    show.value = true
    bucketName.value = bucket
  }
  defineExpose({
    openDrawer
  })
</script>

<style lang="scss" scoped>
</style>