<template>
  <div class="min-h-screen">
    <NaiveProvider>
      <slot />
    </NaiveProvider>
  </div>
</template>
<script lang="ts">
import NaiveProvider from '../components/NaiveProvider.vue';
</script>
