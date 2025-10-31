<script lang="ts" setup>
const router = useRouter()
watchEffect(() => {
  router.push('/browser')
  console.log('Navigated to buckets')
})
</script>
