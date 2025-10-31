<script lang="ts" setup>
import type { DrawerRootEmits, DrawerRootProps } from "vaul-vue"
import { useForwardPropsEmits } from "reka-ui"
import { computed } from "vue"
import { DrawerRoot } from "vaul-vue"

const props = withDefaults(defineProps<DrawerRootProps>(), {
  shouldScaleBackground: true,
})

const emits = defineEmits<DrawerRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
const forwardedProps = computed(() => ({
  ...(forwarded.value as Record<string, unknown>),
}))
</script>

<template>
  <DrawerRoot v-bind="forwardedProps">
    <slot />
  </DrawerRoot>
</template>
