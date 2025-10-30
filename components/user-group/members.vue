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
        <Field>
          <FieldLabel class="text-sm font-medium">{{ t('Select user group members') }}</FieldLabel>
          <FieldContent class="space-y-2">
            <Popover v-model:open="memberSelectorOpen">
              <PopoverTrigger as-child>
                <Button
                  type="button"
                  variant="outline"
                  class="min-h-10 justify-between gap-2"
                  :aria-label="t('Select user group members')"
                >
                  <span class="truncate">
                    {{
                      selectedUserLabels.length
                        ? selectedUserLabels.join(', ')
                        : t('Select user group members')
                    }}
                  </span>
                  <Icon class="size-4 text-muted-foreground" name="ri:arrow-down-s-line" />
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-72 p-0" align="start">
                <Command>
                  <CommandInput :placeholder="t('Search User')" />
                  <CommandList>
                    <CommandEmpty>{{ t('No Data') }}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        v-for="option in users"
                        :key="option.value"
                        :value="option.label"
                        @select="() => toggleMember(option.value)"
                      >
                        <Icon
                          name="ri:check-line"
                          class="mr-2 size-4"
                          :class="members.includes(option.value) ? 'opacity-100' : 'opacity-0'"
                        />
                        <span>{{ option.label }}</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div v-if="members.length" class="flex flex-wrap gap-2">
              <Badge v-for="value in members" :key="value" variant="secondary">{{ value }}</Badge>
            </div>
          </FieldContent>
        </Field>
          </div>
          <div class="flex items-center gap-2 sm:self-start">
            <Button type="button" variant="outline" @click="changeMembers">{{ t('Submit') }}</Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Table class="overflow-hidden rounded-lg border">
      <TableHeader>
        <TableRow>
          <TableHead>{{ t('Name') }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody v-if="filteredMembers.length">
        <TableRow v-for="member in filteredMembers" :key="member">
          <TableCell class="font-medium">{{ member }}</TableCell>
        </TableRow>
      </TableBody>
      <TableBody v-else>
        <TableRow>
          <TableCell class="text-center" colspan="1">
            <p class="py-6 text-sm text-muted-foreground">{{ t('No Data') }}</p>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface UserOption {
  label: string
  value: string
}

const props = defineProps<{
  group: {
    name: string
    members: string[]
  }
}>()

const emit = defineEmits<{ (e: 'search'): void }>()

const { listUsers } = useUsers()
const { updateGroupMembers } = useGroups()
const { t } = useI18n()

const message = useMessage()

const editStatus = ref(false)
const searchTerm = ref('')
const memberSelectorOpen = ref(false)

const users = ref<UserOption[]>([])
const members = ref<string[]>([])

const userLabelMap = computed(() => {
  return users.value.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label
    return acc
  }, {})
})

const selectedUserLabels = computed(() => members.value.map(value => userLabelMap.value[value] ?? value))

const filteredMembers = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  const source = props.group?.members ?? []
  if (!keyword) return source
  return source.filter(item => item.toLowerCase().includes(keyword))
})

watch(
  () => props.group.members,
  newMembers => {
    members.value = [...(newMembers ?? [])]
    if (!newMembers?.length) {
      memberSelectorOpen.value = false
    }
  },
  { immediate: true }
)

const getUserList = async () => {
  try {
    const res = await listUsers()
    users.value = Object.entries(res ?? {}).map(([username, info]) => ({
      label: username,
      value: username,
      ...(typeof info === 'object' ? info : {}),
    }))
  }
  catch (error) {
    message.error(t('Failed to get data'))
  }
}

onMounted(() => {
  getUserList()
})

const startEditing = () => {
  members.value = [...(props.group.members ?? [])]
  memberSelectorOpen.value = false
  editStatus.value = true
}

watch(
  () => props.group.name,
  () => {
    editStatus.value = false
    memberSelectorOpen.value = false
  }
)

const toggleMember = (value: string) => {
  if (members.value.includes(value)) {
    members.value = members.value.filter(item => item !== value)
  }
  else {
    members.value = [...members.value, value]
  }
}

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

    message.success('修改成功')
    editStatus.value = false
    memberSelectorOpen.value = false
    emit('search')
  }
  catch (error) {
    message.error('修改失败')
  }
}
</script>
