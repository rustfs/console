<script setup lang="ts" generic="U extends ZodAny">
import type { ZodAny } from 'zod'
import type { Config, ConfigItem, Shape } from './interface'
import { computed } from 'vue'
import { DEFAULT_ZOD_HANDLERS, INPUT_COMPONENTS } from './constant'
import useDependencies from './dependencies'

const props = defineProps<{
  fieldName: string
  shape: Shape
  config?: ConfigItem | Config<U>
}>()

function isValidConfig(config: any): config is ConfigItem {
  return !!config?.component
}

const delegatedProps = computed(() => {
  if (props.shape && ['ZodObject', 'ZodArray'].includes(props.shape.type)) {
    return { schema: props.shape.schema }
  }
  return undefined
})

const resolvedComponent = computed(() => {
  if (isValidConfig(props.config)) {
    if (typeof props.config.component === 'string') {
      return INPUT_COMPONENTS[props.config.component] ?? INPUT_COMPONENTS.string
    }
    return props.config.component
  }

  if (!props.shape) {
    throw new Error('Shape is required for auto form field')
  }

  const handlerKey = DEFAULT_ZOD_HANDLERS[props.shape.type]

  if (!handlerKey) {
    throw new Error(`Unsupported schema type: ${String(props.shape.type)}`)
  }

  const component = INPUT_COMPONENTS[handlerKey] ?? INPUT_COMPONENTS.string

  if (!component) {
    throw new Error(`Component not registered for handler: ${handlerKey}`)
  }

  return component
})

const { isDisabled, isHidden, isRequired, overrideOptions } = useDependencies(props.fieldName)
</script>

<template>
  <component
    :is="resolvedComponent"
    v-if="!isHidden"
    :field-name="fieldName"
    :label="shape.schema?.description"
    :required="isRequired || shape.required"
    :options="overrideOptions || shape.options"
    :disabled="isDisabled"
    :config="config"
    v-bind="delegatedProps"
  >
    <slot />
  </component>
</template>
