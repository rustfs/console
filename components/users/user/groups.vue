<template>
  <AppCard padded class="space-y-4">
    <div v-if="!editStatus" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="w-full sm:max-w-xs">
        <Input v-model="searchTerm" :placeholder="t('Search Group')" />
      </div>
      <Button variant="secondary" class="inline-flex items-center gap-2" @click="startEditing">
        <Icon class="size-4" name="ri:add-line" />
        {{ t('Edit Group') }}
      </Button>
    </div>

    <div v-else class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex w-full flex-col gap-2">
        <Label class="text-sm font-medium">{{ t('Select Group') }}</Label>
        <Popover v-model:open="groupSelectorOpen">
          <PopoverTrigger as-child>
            <Button
              type="button"
              variant="outline"
              class="min-h-10 justify-between gap-2"
              :aria-label="t('Select Group')"
            >
              <span class="truncate">
                {{ selectedGroupLabels.length ? selectedGroupLabels.join(', ') : t('Select Group') }}
              </span>
              <Icon class="size-4 text-muted-foreground" name="ri:arrow-down-s-line" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-72 p-0" align="start">
            <Command>
              <CommandInput :placeholder="t('Search Group')" />
              <CommandList>
                <CommandEmpty>{{ t('No Data') }}</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    v-for="option in groups"
                    :key="option.value"
                    :value="option.label"
                    @select="() => toggleGroup(option.value)"
                  >
                    <Icon
                      name="ri:check-line"
                      class="mr-2 size-4"
                      :class="selectedGroups.includes(option.value) ? 'opacity-100' : 'opacity-0'"
                    />
                    <span>{{ option.label }}</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div v-if="selectedGroups.length" class="flex flex-wrap gap-2">
          <Badge v-for="value in selectedGroups" :key="value" variant="secondary">{{ value }}</Badge>
        </div>
      </div>
      <div class="flex items-center gap-2 sm:self-start">
        <Button variant="ghost" @click="cancelEditing">
          {{ t('Cancel') }}
        </Button>
        <Button variant="secondary" :loading="submitting" @click="changeMembers">
          {{ t('Submit') }}
        </Button>
      </div>
    </div>

    <Table class="overflow-hidden rounded-lg border">
      <TableHeader>
        <TableRow>
          <TableHead>{{ t('Name') }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody v-if="filteredGroups.length">
        <TableRow v-for="item in filteredGroups" :key="item">
          <TableCell class="font-medium">{{ item }}</TableCell>
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
  </AppCard>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'

import { Icon } from '#components'
import { AppCard } from '@/components/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { listGroup, updateGroupMembers } = useGroups()
const message = useMessage()

const props = defineProps<{
  user: {
    accessKey: string
    memberOf?: string[]
  }
}>()

const emit = defineEmits<{ (e: 'search'): void }>()

const searchTerm = ref('')
const editStatus = ref(false)
const groupSelectorOpen = ref(false)
const groups = ref<{ label: string; value: string }[]>([])
const selectedGroups = ref<string[]>([])
const submitting = ref(false)

const currentGroups = computed(() => props.user.memberOf ?? [])

const filteredGroups = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  const source = currentGroups.value
  if (!keyword) return source
  return source.filter(item => item.toLowerCase().includes(keyword))
})

const groupLabelMap = computed(() => {
  return groups.value.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label
    return acc
  }, {})
})

const selectedGroupLabels = computed(() => selectedGroups.value.map(value => groupLabelMap.value[value] ?? value))

const loadGroups = async () => {
  try {
    const res = await listGroup()
    groups.value = (res ?? []).map((name: string) => ({
      label: name,
      value: name,
    }))
  } catch (error) {
    message.error(t('Failed to get data'))
  }
}

onMounted(() => {
  loadGroups()
  selectedGroups.value = [...currentGroups.value]
})

watch(
  () => props.user.memberOf,
  () => {
    if (!editStatus.value) {
      selectedGroups.value = [...currentGroups.value]
    }
  },
  { immediate: true }
)

const startEditing = () => {
  selectedGroups.value = [...currentGroups.value]
  groupSelectorOpen.value = false
  editStatus.value = true
}

const cancelEditing = () => {
  selectedGroups.value = [...currentGroups.value]
  groupSelectorOpen.value = false
  editStatus.value = false
}

const toggleGroup = (value: string) => {
  if (selectedGroups.value.includes(value)) {
    selectedGroups.value = selectedGroups.value.filter(item => item !== value)
  } else {
    selectedGroups.value = [...selectedGroups.value, value]
  }
}

const changeMembers = async () => {
  if (!props.user?.accessKey) return
  submitting.value = true
  try {
    const originSet = new Set(currentGroups.value)
    const nextSet = new Set(selectedGroups.value)

    const toRemove = Array.from(originSet).filter(item => !nextSet.has(item))
    const toAdd = Array.from(nextSet).filter(item => !originSet.has(item))

    await Promise.all([
      ...toRemove.map(group =>
        updateGroupMembers({
          group,
          members: [props.user.accessKey],
          isRemove: true,
          groupStatus: 'enabled',
        })
      ),
      ...toAdd.map(group =>
        updateGroupMembers({
          group,
          members: [props.user.accessKey],
          isRemove: false,
          groupStatus: 'enabled',
        })
      ),
    ])

    message.success(t('Update Success'))
    editStatus.value = false
    groupSelectorOpen.value = false
    emit('search')
  } catch (error) {
    message.error(t('Update Failed'))
  } finally {
    submitting.value = false
  }
}
</script>