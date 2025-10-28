<template>
  <AppModal v-model="visible" :title="t('Create User')" size="lg" :close-on-backdrop="false">
    <div class="space-y-6">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label>{{ t('User Name') }}</Label>
          <Input v-model="editForm.accessKey" autocomplete="off" />
          <p v-if="errors.accessKey" class="text-xs text-destructive">{{ errors.accessKey }}</p>
        </div>
        <div class="space-y-2">
          <Label>{{ t('Password') }}</Label>
          <Input v-model="editForm.secretKey" type="password" autocomplete="off" />
          <p v-if="errors.secretKey" class="text-xs text-destructive">{{ errors.secretKey }}</p>
        </div>
      </div>

      <div class="space-y-2">
        <Label>{{ t('Groups') }}</Label>
        <Popover v-model:open="groupSelectorOpen">
          <PopoverTrigger as-child>
            <Button
              type="button"
              variant="outline"
              class="min-h-10 justify-between gap-2"
              :aria-label="t('Groups')"
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
                    v-for="option in groupsList"
                    :key="option.value"
                    :value="option.label"
                    @select="() => toggleGroup(option.value)"
                  >
                    <Icon
                      name="ri:check-line"
                      class="mr-2 size-4"
                      :class="editForm.groups.includes(option.value) ? 'opacity-100' : 'opacity-0'"
                    />
                    <span>{{ option.label }}</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div v-if="editForm.groups.length" class="flex flex-wrap gap-2">
          <Badge v-for="value in editForm.groups" :key="value" variant="secondary">{{ value }}</Badge>
        </div>
      </div>

      <div class="space-y-2">
        <Label>{{ t('Policy') }}</Label>
        <Popover v-model:open="policySelectorOpen">
          <PopoverTrigger as-child>
            <Button
              type="button"
              variant="outline"
              class="min-h-10 justify-between gap-2"
              :aria-label="t('Policy')"
            >
              <span class="truncate">
                {{ selectedPolicyLabels.length ? selectedPolicyLabels.join(', ') : t('Select user group policies') }}
              </span>
              <Icon class="size-4 text-muted-foreground" name="ri:arrow-down-s-line" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-72 p-0" align="start">
            <Command>
              <CommandInput :placeholder="t('Search Policy')" />
              <CommandList>
                <CommandEmpty>{{ t('No Data') }}</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    v-for="option in policiesList"
                    :key="option.value"
                    :value="option.label"
                    @select="() => togglePolicy(option.value)"
                  >
                    <Icon
                      name="ri:check-line"
                      class="mr-2 size-4"
                      :class="editForm.policies.includes(option.value) ? 'opacity-100' : 'opacity-0'"
                    />
                    <span>{{ option.label }}</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div v-if="editForm.policies.length" class="flex flex-wrap gap-2">
          <Badge v-for="value in editForm.policies" :key="value" variant="secondary">{{ value }}</Badge>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="closeModal">
          {{ t('Cancel') }}
        </Button>
        <Button variant="default" :loading="submitting" @click="submitForm">
          {{ t('Submit') }}
        </Button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'

import { Icon } from '#components'
import { AppModal } from '@/components/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const { createUser } = useUsers()
const { listPolicies, setUserOrGroupPolicy } = usePolicies()
const { listGroup, updateGroupMembers } = useGroups()

const emit = defineEmits<{
  (e: 'search'): void
}>()

const visible = ref(false)
const submitting = ref(false)

const editForm = reactive({
  accessKey: '',
  secretKey: '',
  groups: [] as string[],
  policies: [] as string[],
})

const errors = reactive({
  accessKey: '',
  secretKey: '',
})

const groupsList = ref<{ label: string; value: string }[]>([])
const policiesList = ref<{ label: string; value: string }[]>([])
const groupSelectorOpen = ref(false)
const policySelectorOpen = ref(false)

const selectedGroupLabels = computed(() => {
  const map = groupsList.value.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label
    return acc
  }, {})
  return editForm.groups.map(value => map[value] ?? value)
})

const selectedPolicyLabels = computed(() => {
  const map = policiesList.value.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label
    return acc
  }, {})
  return editForm.policies.map(value => map[value] ?? value)
})

const resetForm = () => {
  editForm.accessKey = ''
  editForm.secretKey = ''
  editForm.groups = []
  editForm.policies = []
  errors.accessKey = ''
  errors.secretKey = ''
  groupSelectorOpen.value = false
  policySelectorOpen.value = false
}

const openDialog = async () => {
  await Promise.all([getGroupsList(), getPoliciesList()])
  visible.value = true
}

const closeModal = () => {
  visible.value = false
  resetForm()
}

defineExpose({
  openDialog,
})

const validate = () => {
  errors.accessKey = ''
  errors.secretKey = ''

  if (!editForm.accessKey.trim()) {
    errors.accessKey = t('Please enter username')
  } else if (!/^.{8,16}$/.test(editForm.accessKey)) {
    errors.accessKey = t('username length cannot be less than 8 characters and greater than 16 characters')
  }

  if (!editForm.secretKey.trim()) {
    errors.secretKey = t('Please enter password')
  } else if (!/^.{8,16}$/.test(editForm.secretKey)) {
    errors.secretKey = t('password length cannot be less than 8 characters and greater than 16 characters')
  }

  return !errors.accessKey && !errors.secretKey
}

const submitForm = async () => {
  if (!validate()) {
    message.error(t('Please fill in the correct format'))
    return
  }

  submitting.value = true
  try {
    await createUser({
      accessKey: editForm.accessKey,
      secretKey: editForm.secretKey,
      status: 'enabled',
    })

    if (editForm.policies.length) {
      await setUserOrGroupPolicy({
        policyName: editForm.policies,
        userOrGroup: editForm.accessKey,
        isGroup: false,
      })
    }

    if (editForm.groups.length) {
      await Promise.all(
        editForm.groups.map(group =>
          updateGroupMembers({
            group,
            members: [editForm.accessKey],
            isRemove: false,
            groupStatus: 'enabled',
          })
        )
      )
    }

    message.success(t('Add Success'))
    emit('search')
    closeModal()
  } catch (error) {
    console.error(error)
    message.error(t('Add Failed'))
    submitting.value = false
  }
}

const getPoliciesList = async () => {
  const res = await listPolicies()
  policiesList.value = Object.keys(res ?? {})
    .sort((a, b) => a.localeCompare(b))
    .map(key => ({
      label: key,
      value: key,
    }))
}

const getGroupsList = async () => {
  const res = await listGroup()
  groupsList.value = (res ?? []).map((item: string) => ({
    label: item,
    value: item,
  }))
}

const toggleGroup = (value: string) => {
  if (editForm.groups.includes(value)) {
    editForm.groups = editForm.groups.filter(item => item !== value)
  } else {
    editForm.groups = [...editForm.groups, value]
  }
}

const togglePolicy = (value: string) => {
  if (editForm.policies.includes(value)) {
    editForm.policies = editForm.policies.filter(item => item !== value)
  } else {
    editForm.policies = [...editForm.policies, value]
  }
}
</script>
