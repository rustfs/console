<script lang="ts" setup>
const router = useRouter()
router.push('/browser')

watchEffect(() => {
  console.log('Navigated to buckets')
})

</script>
