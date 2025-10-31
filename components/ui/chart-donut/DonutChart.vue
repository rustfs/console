<script setup lang="ts" generic="T extends Record<string, any>">
import type { Component } from "vue"
import type { BaseChartProps } from "."
import { Donut } from "@unovis/ts"
import { VisDonut, VisSingleContainer } from "@unovis/vue"
import { useMounted } from "@vueuse/core"
import { computed, ref } from "vue"
import { cn } from "@/lib/utils"
import { ChartSingleTooltip, defaultColors } from '@/components/ui/chart'

const props = withDefaults(defineProps<Pick<BaseChartProps<T>, "data" | "colors" | "index" | "margin" | "showLegend" | "showTooltip" | "filterOpacity"> & {
  /**
   * Sets the name of the key containing the quantitative chart values.
   */
  category: KeyOfT
  /**
   * Change the type of the chart
   * @default "donut"
   */
  type?: "donut" | "pie"
  /**
   * Function to sort the segment
   */
  sortFunction?: (a: any, b: any) => number | undefined
  /**
   * Controls the formatting for the label.
   */
  valueFormatter?: (tick: number, i?: number, ticks?: number[]) => string
  /**
   * Render custom tooltip component.
   */
  customTooltip?: Component
}>(), {
  margin: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  sortFunction: () => undefined,
  type: "donut",
  filterOpacity: 0.2,
  showTooltip: true,
  showLegend: true,
})

type KeyOfT = Extract<keyof T, string>
type Data = T

const valueFormatter = props.valueFormatter ?? ((tick: number) => `${tick}`)
const category = computed(() => props.category as KeyOfT)
const index = computed(() => props.index as KeyOfT)
const chartData = computed(() => props.data ?? [])

const isMounted = useMounted()
const activeSegmentKey = ref<string>()
const colors = computed(() => props.colors?.length ? props.colors : defaultColors(chartData.value.filter(d => d[category.value]).length))
const legendItems = computed(() => chartData.value.map((item, i) => ({
  name: item[index.value],
  color: colors.value[i],
  inactive: false,
})))

const segmentEvents = computed(() => ({
  [Donut.selectors.segment]: {
    click: (d: Data, _ev: PointerEvent, elementIndex: number, elements: HTMLElement[] = []) => {
      const segmentKey = d?.data?.[index.value as keyof Data] as unknown as string | undefined
      if (!elements.length) {
        return
      }

      if (segmentKey && activeSegmentKey.value === segmentKey) {
        activeSegmentKey.value = undefined
        elements.forEach(el => {
          el.style.opacity = "1"
        })
        return
      }

      activeSegmentKey.value = segmentKey
      elements.forEach(el => {
        el.style.opacity = `${props.filterOpacity}`
      })
      const target = elements[elementIndex]
      if (target) {
        target.style.opacity = "1"
      }
    },
  },
}))

const totalValue = computed(() => chartData.value.reduce((prev, curr) => prev + (Number(curr[category.value]) || 0), 0))
</script>

<template>
  <div :class="cn('w-full h-48 flex flex-col items-end', $attrs.class ?? '')">
    <VisSingleContainer :style="{ height: isMounted ? '100%' : 'auto' }" :margin="{ left: 20, right: 20 }" :data="data">
      <ChartSingleTooltip
        :selector="Donut.selectors.segment"
        :index="category"
        :items="legendItems"
        :value-formatter="valueFormatter"
        :custom-tooltip="customTooltip"
      />

      <VisDonut
        :value="(d: Data) => d[category]"
        :sort-function="sortFunction"
        :color="colors"
        :arc-width="type === 'donut' ? 20 : 0"
        :show-background="false"
        :central-label="type === 'donut' ? valueFormatter(totalValue) : ''"
        :events="segmentEvents"
      />

      <slot />
    </VisSingleContainer>
  </div>
</template>
