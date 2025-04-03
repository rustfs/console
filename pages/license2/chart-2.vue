<script setup lang="ts">
const lineOptions = ref<ECOption>({
    title: {
        text: '每周MB/s变化趋势',
        left: 'center',
        textStyle: {
            color: '#fff'
        }
    },
    tooltip: {
        trigger: 'axis'
    },
     grid: {
        top: '15%', 
        left: '0%', 
        right: '0%', 
        bottom: '0%', 
        containLabel: true // 确保标签不会被裁剪
        },
    xAxis: {
        type: 'category',
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        axisLabel: {
            color: '#fff'
        }
    },
    yAxis: {
        type: 'value',
        name: 'MB/s',
        min: 0,
        max: 300,
        interval: 50,
        axisLabel: {
            color: '#fff'
        }
    },
    series: [{
        data: [140, 220, 210, 200, 160, 140, 260],
        type: 'line',
        smooth: true,
        itemStyle: {
            color: '#409eff'
        },
        lineStyle: {
            color: '#409eff'
        }
    }]
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