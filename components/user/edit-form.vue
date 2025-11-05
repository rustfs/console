<template>
  <Modal v-model="visible" :title="user.accessKey || t('Account')" size="lg" :close-on-backdrop="false">
    <div class="space-y-4">
      <div class="flex items-center justify-between rounded-md border px-3 py-2">
        <span class="text-sm text-muted-foreground">{{ t('Status') }}</span>
        <Switch v-model="statusBoolean" />
      </div>

      <Tabs v-model="activeTab" class="flex flex-col gap-4">
        <TabsList class="w-full justify-start overflow-x-auto">
          <TabsTrigger value="groups">{{ t('Groups') }}</TabsTrigger>
          <TabsTrigger value="policy">{{ t('Policies') }}</TabsTrigger>
          <TabsTrigger value="account">{{ t('Account') }}</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" class="mt-0">
          <user-groups :user="user" @search="refreshUser" />
        </TabsContent>
        <TabsContent value="policy" class="mt-0">
          <user-policies :user="user" @search="refreshUser" />
        </TabsContent>
        <TabsContent value="account" class="mt-0">
          <user-account :user="user" @search="refreshUser" @notice="noticeDialog" />
        </TabsContent>
      </Tabs>

      <user-notice ref="noticeRef" @search="refreshUser" />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '~/components/modal.vue'

const { t } = useI18n()
const visible = ref(false)
const activeTab = ref('groups')
const { getUser, changeUserStatus } = useUsers()

interface UserInfo {
  accessKey: string
  memberOf: string[]
  policy: string[]
  status: string
}

const user = ref<UserInfo>({
  accessKey: '',
  memberOf: [],
  policy: [],
  status: 'enabled',
})

const statusBoolean = computed({
  get: () => user.value.status === 'enabled',
  set: async value => {
    const nextStatus = value ? 'enabled' : 'disabled'
    if (user.value.accessKey) {
      await changeUserStatus(user.value.accessKey, {
        accessKey: user.value.accessKey,
        status: nextStatus,
      })
      await refreshUser()
    }
  },
})

const refreshUser = async () => {
  if (!user.value.accessKey) return
  const latest = await getUser(user.value.accessKey)
  user.value = {
    accessKey: user.value.accessKey,
    memberOf: latest.memberOf ?? [],
    policy: latest.policyName?.split(',') ?? [],
    status: latest.status ?? 'enabled',
  }
}

const noticeRef = ref()
const noticeDialog = (data: any) => {
  noticeRef.value?.openDialog(data)
}

async function openDialog(row: any) {
  user.value = {
    accessKey: row.accessKey,
    memberOf: row.memberOf ?? [],
    policy: row.policy ?? [],
    status: row.status ?? 'enabled',
  }
  activeTab.value = 'groups'
  visible.value = true
  await refreshUser()
}

defineExpose({
  openDialog,
})
</script>
