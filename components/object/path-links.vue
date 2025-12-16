<template>
  <template v-for="segment in displaySegments">
    <span class="text-gray-500">&nbsp;/&nbsp;</span>
    <button
      @click="() => handleOnClick(segment)"
      :class="{ 'text-blue-500 hover:underline': segment.index > -1, 'cursor-default': segment.index === -1 }"
    >
      {{ segment.value }}
    </button>
  </template>
</template>

<script lang="ts" setup>
const props = defineProps<{
  objectKey: string
  onClick: (path: string) => any
}>()

const segments = computed(() =>
  props.objectKey
    .split('/')
    .filter(Boolean)
    .map((item, index) => {
      return {
        value: item,
        index,
      }
    })
)

const displaySegments = computed(() => {
  if (segments.value.length <= 6) {
    return segments.value
  }

  return [...segments.value.slice(0, 3), { value: '...', index: -1 }, ...segments.value.slice(-3)]
})

const handleOnClick = (segment: { value: string; index: number }) => {
  if (segment.index === -1) {
    return
  }

  const path = segments.value
    .slice(0, segment.index + 1)
    .map(item => item.value)
    .join('/')
  props.onClick(path)
}
</script>
