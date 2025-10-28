<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost">
        <div class="flex items-center gap-3">
          <span class="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
            <img src="~/assets/img/rustfs.png" alt="RustFS" class="h-8 w-8 rounded-full object-cover" />
          </span>
        </div>
        <Icon v-if="!isCollapsed" name="ri:more-2-line" class="h-4 w-4 text-muted-foreground" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="w-48" align="end" side="top">
      <DropdownMenuItem @select="handleLogout">
        <Icon name="ri:logout-box-r-line" class="h-4 w-4" />
        <span>{{ t('Logout') }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { defineProps, toRef, withDefaults } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { logout } = useAuth()
const router = useRouter()

const props = withDefaults(
  defineProps<{
    isCollapsed?: boolean
  }>(),
  {
    isCollapsed: false,
  }
)

const isCollapsed = toRef(props, 'isCollapsed')

const handleLogout = async () => {
  await logout()
  router.push('/auth/login')
}
</script>
