<template>
  <n-dropdown :options="options" placement="right-end" @select="handleDropdownClick">
    <div class="flex items-center border-t dark:border-neutral-800 py-4">
      <n-avatar round size="small" src="/img/rustfs.png" />
      <template v-if="!isCollapsed">
        <span class="px-2">RustFS</span>
        <Icon name="ri:more-2-line" class="ml-auto text-xl" />
      </template>
    </div>
  </n-dropdown>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import { defineProps, withDefaults } from 'vue'

const { logout } = useAuth()
const router = useRouter()


const handleLogout = async () => {
  await logout()
  router.push('/auth/login')
}

const handleDropdownClick = (key: string) => {
  if (key === 'logout') {
    handleLogout()
  }
}

const props = withDefaults(defineProps<{
  isCollapsed?: boolean
}>(), {
  isCollapsed: false
})

const options = [
  {
    label: '用户资料',
    key: 'profile',
    icon: () => icon('ri:account-box-line')
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: () => icon('ri:logout-box-r-line'),
  },
]
</script>
