<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    class?: HTMLAttributes['class']
    contentClass?: HTMLAttributes['class']
    footerClass?: HTMLAttributes['class']
    padded?: boolean
  }>(),
  {
    title: undefined,
    description: undefined,
    class: undefined,
    contentClass: undefined,
    footerClass: undefined,
    padded: true,
  }
)
</script>

<template>
  <Card :class="cn('border-border/60', props.class)">
    <CardHeader v-if="title || $slots.header">
      <slot name="header">
        <CardTitle v-if="title">{{ title }}</CardTitle>
        <CardDescription v-if="description">{{ description }}</CardDescription>
      </slot>
    </CardHeader>
    <CardContent :class="cn(padded && 'space-y-4', contentClass)">
      <slot />
    </CardContent>
    <CardFooter v-if="$slots.footer" :class="footerClass">
      <slot name="footer" />
    </CardFooter>
  </Card>
</template>
