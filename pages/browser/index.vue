<template>
  <div>
    buckets

    <div>
      Error: {{ error }}
      Status: {{ status }}
      Buckets: {{ buckets }}
    </div>
  </div>
</template>

<script lang="ts" setup>
const { data: buckets, status, error } = await useAPI('/buckets')
console.log(buckets, status, error);
</script>
