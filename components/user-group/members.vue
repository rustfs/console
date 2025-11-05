<template>
  <div class="space-y-4">
    <Card class="shadow-none">
      <CardContent class="space-y-4 pt-6">
        <div v-if="!editStatus" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="w-full sm:max-w-xs">
            <SearchInput v-model="searchTerm" :placeholder="t('Search User')" clearable class="w-full" />
          </div>
          <Button type="button" variant="outline" class="inline-flex items-center gap-2" @click="startEditing">
            <Icon class="size-4" name="ri:add-line" />
            {{ t('Edit User') }}
          </Button>
        </div>
        <div v-else class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="flex w-full flex-col gap-2">
            <UserSelector
              v-model="members"
              :label="t('Select user group members')"
              :placeholder="t('Select user group members')"
            />
          </div>
          <div class="flex items-center gap-2 sm:self-end">
            <Button type="button" variant="outline" @click="changeMembers">{{ t('Submit') }}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
    <div v-if="editStatus && members.length" class="flex flex-wrap gap-2">
      <Badge v-for="value in members" :key="value" variant="secondary">
        {{ value }}
      </Badge>
    </div>

    <DataTable :table="table" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import UserSelector from '@/components/user-selector.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ColumnDef } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  group: {
    name: string
    members: string[]
  }
}>()

const emit = defineEmits<{ (e: 'search'): void }>()

const { updateGroupMembers } = useGroups()
const { t } = useI18n()

const message = useMessage()

const editStatus = ref(false)
const searchTerm = ref('')
const members = ref<string[]>([])

interface MemberItem {
  name: string
}

const membersData = computed<MemberItem[]>(() => (props.group?.members ?? []).map(name => ({ name })))

const columns: ColumnDef<MemberItem>[] = [
  {
    id: 'name',
    header: () => t('Name'),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
  },
]

const { table } = useDataTable<MemberItem>({
  data: membersData,
  columns,
  getRowId: row => row.name,
})

watch(searchTerm, value => {
  table.getColumn('name')?.setFilterValue(value || undefined)
})

watch(
  () => props.group.members,
  newMembers => {
    members.value = [...(newMembers ?? [])]
  },
  { immediate: true }
)

const startEditing = () => {
  members.value = [...(props.group.members ?? [])]
  editStatus.value = true
}

watch(
  () => props.group.name,
  () => {
    editStatus.value = false
  }
)

const changeMembers = async () => {
  try {
    const currentMembers = props.group.members ?? []
    const nowRemoveMembers = currentMembers.filter(item => !members.value.includes(item))

    if (nowRemoveMembers.length) {
      await updateGroupMembers({
        group: props.group.name,
        members: nowRemoveMembers,
        isRemove: true,
        groupStatus: 'enabled',
      })
    }

    await updateGroupMembers({
      group: props.group.name,
      members: members.value,
      isRemove: false,
      groupStatus: 'enabled',
    })

    message.success(t('Edit Success'))
    editStatus.value = false
    emit('search')
  } catch (error) {
    message.error(t('Edit Failed'))
  }
}
</script>
