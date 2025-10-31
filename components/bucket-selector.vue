<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useBucket } from '@/composables/useBucket'
import { cn } from '@/lib/utils'
import type { Bucket } from '@aws-sdk/client-s3'
import type { HTMLAttributes } from 'vue'
import { computed, useAttrs, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SelectOption } from '~/components/selector.vue'

defineOptions({ inheritAttrs: false })

const modelValue = defineModel<string | null>({
  default: null,
})

const props = withDefaults(
  defineProps<{
    options?: SelectOption[]
    label?: string
    placeholder?: string
    disabled?: boolean
    description?: string
    layout?: 'inline' | 'stacked'
    class?: HTMLAttributes['class']
    selectorClass?: HTMLAttributes['class']
    loading?: boolean
    emptyMessage?: string
    autoLoad?: boolean
    cacheKey?: string
  }>(),
  {
    options: undefined,
    label: undefined,
    placeholder: 'Please select bucket',
    disabled: false,
    description: undefined,
    layout: 'inline',
    class: undefined,
    selectorClass: undefined,
    loading: false,
    emptyMessage: undefined,
    autoLoad: true,
    cacheKey: 'bucket-selector-buckets',
  }
)

const attrs = useAttrs()
const { t } = useI18n()

// 如果传入了 options，直接使用；否则自动获取
const shouldAutoLoad = computed(() => !props.options && props.autoLoad)

// 计算显示的 label，如果用户传入了 label 则使用用户的，否则使用国际化的 "Bucket"
const displayLabel = computed(() => props.label || t('Bucket'))

const { listBuckets } = useBucket({})

const { data: bucketData, pending: bucketsLoading } = await useAsyncData<Bucket[]>(
  props.cacheKey,
  async () => {
    if (!shouldAutoLoad.value) {
      return []
    }
    const response = await listBuckets()
    const buckets = (response.Buckets ?? []).filter((bucket): bucket is Bucket => Boolean(bucket?.Name))
    return buckets.sort((a, b) => (a.Name ?? '').localeCompare(b.Name ?? ''))
  },
  { default: () => [] as Bucket[], server: false }
)

const bucketOptions = computed<SelectOption[]>(() => {
  // 如果传入了 options，优先使用
  if (props.options) {
    return props.options
  }

  // 否则使用自动获取的 bucket 列表
  const buckets = bucketData.value ?? []
  return buckets.reduce<SelectOption[]>((acc, bucket) => {
    const name = bucket.Name ?? ''
    if (!name) {
      return acc
    }
    acc.push({ label: name, value: name })
    return acc
  }, [])
})

// 自动设置第一个 bucket 为默认值（仅在组件初始化时且 modelValue 为空时）
watch(
  () => bucketOptions.value,
  newOptions => {
    if (shouldAutoLoad.value && newOptions.length > 0 && modelValue.value === null) {
      const firstBucket = newOptions[0]
      if (firstBucket?.value) {
        modelValue.value = String(firstBucket.value)
      }
    }
  },
  { immediate: true }
)

const isLoading = computed(() => props.loading || (shouldAutoLoad.value && bucketsLoading.value))

// 计算选中项显示的文本，添加 "Bucket: " 前缀
const selectedDisplayText = computed(() => {
  if (!modelValue.value) {
    return ''
  }
  const selectedOption = bucketOptions.value.find(opt => String(opt.value) === String(modelValue.value))
  if (!selectedOption) {
    return String(modelValue.value)
  }
  return `${displayLabel.value}: ${selectedOption.label}`
})

const containerClasses = computed(() => (props.layout === 'inline' ? 'flex items-center gap-3' : 'flex flex-col gap-2'))

const controlWrapperClasses = computed(() =>
  props.layout === 'inline' ? 'flex flex-col gap-1 min-w-[220px]' : 'flex flex-col gap-1'
)
</script>

<template>
  <div v-bind="attrs" :class="cn(containerClasses, props.class)">
    <div :class="controlWrapperClasses">
      <Select v-model="modelValue" :disabled="props.disabled || isLoading">
        <SelectTrigger :class="cn('min-w-[200px]', props.selectorClass)">
          <SelectValue :placeholder="props.placeholder">
            <span v-if="selectedDisplayText">{{ selectedDisplayText }}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <template v-if="bucketOptions.length">
            <SelectItem
              v-for="option in bucketOptions"
              :key="String(option.value)"
              :value="String(option.value)"
              :disabled="option.disabled"
            >
              {{ option.label }}
            </SelectItem>
          </template>
          <div v-else class="px-2 py-3 text-sm text-muted-foreground">
            {{ props.emptyMessage || 'No options available' }}
          </div>
        </SelectContent>
      </Select>
      <p v-if="props.description" class="text-xs text-muted-foreground">
        {{ props.description }}
      </p>
    </div>
    <Spinner v-if="isLoading && props.layout === 'inline'" class="size-4 text-muted-foreground" />
  </div>
</template>
