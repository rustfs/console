<template>
  <Modal v-model="visible" :title="group.name || t('Members')" size="lg" :close-on-backdrop="false">
    <div class="space-y-4">
      <div class="flex items-center justify-between rounded-md border px-3 py-2">
        <span class="text-sm text-muted-foreground">{{ t('Status') }}</span>
        <Switch v-model="statusBoolean" />
      </div>

      <Tabs v-model="activeTab" class="flex flex-col gap-4">
        <TabsList class="w-full justify-start overflow-x-auto">
          <TabsTrigger value="users">{{ t('Members') }}</TabsTrigger>
          <TabsTrigger value="policy">{{ t('Policies') }}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" class="mt-0">
          <user-group-members :group="group" @search="getGroupData(group.name)" />
        </TabsContent>
        <TabsContent value="policy" class="mt-0">
          <user-group-policies :group="group" @search="getGroupData(group.name)" />
        </TabsContent>
      </Tabs>
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
const activeTab = ref('users')
const { getGroup, updateGroupStatus } = useGroups()

interface GroupInfo {
  name: string
  members: string[]
  status: string
}

const group = ref<GroupInfo>({
  name: '',
  members: [],
  status: 'enabled',
})

const statusBoolean = computed({
  get: () => group.value.status === 'enabled',
  set: async value => {
    const nextStatus = value ? 'enabled' : 'disabled'
    if (nextStatus !== group.value.status) {
      await handleGroupStatusChange(nextStatus)
    }
  },
})

const handleGroupStatusChange = async (status: string) => {
  await updateGroupStatus(group.value.name, { ...group.value, status })
  await getGroupData(group.value.name)
}

async function openDialog(row: any) {
  await getGroupData(row.name)
  activeTab.value = 'users'
  visible.value = true
}

async function getGroupData(name: string) {
  group.value = await getGroup(name)
}

defineExpose({
  openDialog,
})
</script>
