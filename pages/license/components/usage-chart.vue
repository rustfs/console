<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const lineOptions = ref<ECOption>({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b} : {c} ({d}%)',
    textStyle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    textStyle: {
      color: '#fff', // 主题颜色
      fontSize: 18,
      fontWeight: 'bold',
    },
    data: [t('Used (7TB)'), t('Remaining (3TB)')],
  },
  series: [
    {
      name: t('Storage Usage Statistics'),
      type: 'pie',
      radius: ['50%', '70%'],
      avoidLabelOverlap: false,
      label: {
        show: false,
        position: 'center',
      },
      labelLine: {
        show: false,
      },
      data: [
        { value: 7, name: t('Used (7TB)'), itemStyle: { color: '#2f98ff' } },
        { value: 3, name: t('Remaining (3TB)'), itemStyle: { color: '#61cda3' } },
      ],
    },
  ],
}) as Ref<ECOption>

useEcharts('lineRef', lineOptions)
</script>

<template>
  <div ref="lineRef" class="h-64" />
</template>

<style scoped></style>
