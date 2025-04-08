<script setup lang="ts">
const lineOptions = ref<ECOption>({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b} : {c} ({d}%)',
    textStyle: {
      fontSize: 18,
      fontWeight: 'bold'
    }
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    textStyle: {
      color: '#fff', // 主题颜色
      fontSize: 18,
      fontWeight: 'bold'
    },
    data: ['已使用 (7TB)', '剩余 (3TB)']
  },
  series: [
    {
      name: '存储使用统计',
      type: 'pie',
      radius: ['50%', '70%'],
      avoidLabelOverlap: false,
      label: {
        show: false,
        position: 'center'
      },
      labelLine: {
        show: false
      },
      data: [
        { value: 7, name: '已使用 (7TB)', itemStyle: { color: '#2f98ff' } },
        { value: 3, name: '剩余 (3TB)', itemStyle: { color: '#61cda3' } }
      ]
    }
  ]
}) as Ref<ECOption>

useEcharts('lineRef', lineOptions)
</script>

<template>
  <div
    ref="lineRef"
    class="h-64"
  />
</template>

<style scoped>

</style>