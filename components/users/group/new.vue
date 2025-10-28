<script setup lang="ts">
import { Input } from '@/components/ui/input'

import { Icon } from '#components'
import { AppModal } from '@/components/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'search'): void
}>()

const { t } = useI18n()
const message = useMessage()
const { updateGroupMembers } = useGroups()
const { listUsers } = useUsers()

const defaultFormModel = () => ({
  group: '',
  members: [] as string[],
})

const formModel = reactive(defaultFormModel())
const submitting = ref(false)
const memberSelectorOpen = ref(false)
const users = ref<{ label: string; value: string }[]>([])

const modalVisible = computed({
  get: () => props.visible,
  set: value => closeModal(value),
})

const selectedMemberLabels = computed(() => {
  const map = users.value.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label
    return acc
  }, {})

  return formModel.members.map(value => map[value] ?? value)
})

const loadUsers = async () => {
  try {
    const res = await listUsers()
    users.value = Object.entries(res ?? {}).map(([username]) => ({
      label: username,
      value: username,
    }))
  } catch (error) {
    message.error(t('Failed to get data'))
  }
}

loadUsers()

const toggleMember = (value: string) => {
  if (formModel.members.includes(value)) {
    formModel.members = formModel.members.filter(item => item !== value)
  } else {
    formModel.members = [...formModel.members, value]
  }
}

const closeModal = (visible = false) => {
  Object.assign(formModel, defaultFormModel())
  memberSelectorOpen.value = false
  emit('update:visible', visible)
}

const submitForm = async () => {
  if (!formModel.group.trim()) {
    message.error(t('Please enter user group name'))
    return
  }

  submitting.value = true
  try {
    await updateGroupMembers({
      ...formModel,
      groupStatus: 'enabled',
      isRemove: false,
    })

    message.success(t('Add success'))
    closeModal()
    emit('search')
  } catch (error) {
    message.error(t('Add failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppModal v-model="modalVisible" :title="t('Add group members')" size="lg" :close-on-backdrop="false">
    <div class="space-y-6">
      <div class="space-y-2">
        <Label class="text-sm font-medium">{{ t('Name') }}</Label>
        <Input v-model="formModel.group" autocomplete="off" />
      </div>

      <div class="space-y-2">
        <Label class="text-sm font-medium">{{ t('Users') }}</Label>
        <Popover v-model:open="memberSelectorOpen">
          <PopoverTrigger as-child>
            <Button
              type="button"
              variant="outline"
              class="min-h-10 w-full justify-between gap-2"
              :aria-label="t('Users')"
            >
              <span class="truncate">
                {{
                  selectedMemberLabels.length ? selectedMemberLabels.join(', ') : t('Select user group members')
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
                      :class="formModel.members.includes(option.value) ? 'opacity-100' : 'opacity-0'"
                    />
                    <span>{{ option.label }}</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div v-if="formModel.members.length" class="flex flex-wrap gap-2">
          <Badge v-for="value in formModel.members" :key="value" variant="secondary">
            {{ value }}
          </Badge>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="closeModal()">
          {{ t('Cancel') }}
        </Button>
        <Button variant="default" :loading="submitting" @click="submitForm">
          {{ t('Submit') }}
        </Button>
      </div>
    </template>
  </AppModal>
</template>
