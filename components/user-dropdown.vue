<template>
  <n-dropdown :options="options" placement="right-end" @select="handleDropdownClick">
    <div class="flex items-center border-t dark:border-neutral-800 p-4">
      <n-avatar round size="small" src="/img/rustfs.png" />
      <template v-if="!isCollapsed">
        <span class="px-2">{{ t('RustFS') }}</span>
        <Icon name="ri:more-2-line" class="ml-auto text-xl" />
      </template>
    </div>
  </n-dropdown>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import { defineProps, withDefaults } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
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
  // {
  //   label: t('Profile'),
  //   key: 'profile',
  //   icon: () => icon('ri:account-box-line')
  // },
  {
    label: t('Logout'),
    key: 'logout',
    icon: () => icon('ri:logout-box-r-line'),
  },
]
</script>
