<template>
  <Modal v-model="visible" :title="t('Create User')" size="lg" :close-on-backdrop="false">
    <div class="space-y-6">
      <div class="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel>{{ t('User Name') }}</FieldLabel>
          <FieldContent>
            <Input
              v-model="editForm.accessKey"
              default-value=""
              minlength="4"
              name="new-user-access-key"
              spellcheck="false"
              autocomplete="new-user-access-key"
            />
          </FieldContent>
          <FieldDescription v-if="errors.accessKey" class="text-destructive">
            {{ errors.accessKey }}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>{{ t('Password') }}</FieldLabel>
          <FieldContent>
            <Input
              v-model="editForm.secretKey"
              default-value=""
              minlength="8"
              id="new-user-password"
              spellcheck="false"
              type="password"
              name="new-user-password"
              autocomplete="new-user-password"
              aria-autocomplete="none"
            />
          </FieldContent>
          <FieldDescription v-if="errors.secretKey" class="text-destructive">
            {{ errors.secretKey }}
          </FieldDescription>
        </Field>
      </div>

      <Field>
        <FieldLabel>{{ t('Groups') }}</FieldLabel>
        <FieldContent>
          <Popover v-model:open="groupSelectorOpen">
            <PopoverTrigger as-child>
              <Button type="button" variant="outline" class="min-h-10 justify-between gap-2" :aria-label="t('Groups')">
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
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>{{ t('Policy') }}</FieldLabel>
        <FieldContent>
          <Popover v-model:open="policySelectorOpen">
            <PopoverTrigger as-child>
              <Button type="button" variant="outline" class="min-h-10 justify-between gap-2" :aria-label="t('Policy')">
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
                      :class="{
                        'opacity-70 cursor-not-allowed': editForm.groupInheritedPolicies.includes(option.value),
                      }"
                      :disabled="editForm.groupInheritedPolicies.includes(option.value)"
                    >
                      <Icon
                        name="ri:check-line"
                        class="mr-2 size-4"
                        :class="editForm.policies.includes(option.value) ? 'opacity-100' : 'opacity-0'"
                      />
                      <span>{{ option.label }}</span>
                      <span
                        v-if="editForm.groupInheritedPolicies.includes(option.value)"
                        class="ml-2 text-xs text-muted-foreground opacity-70"
                        >({{ t('Inherited from group') }})</span
                      >
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <div v-if="editForm.policies.length" class="flex flex-wrap gap-2">
            <Badge v-for="value in editForm.policies" :key="value" variant="secondary">{{ value }}</Badge>
          </div>
        </FieldContent>
      </Field>
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
  </Modal>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useI18n } from 'vue-i18n'
import { useNuxtApp } from '#app'
import Modal from '~/components/modal.vue'

const { t } = useI18n()
const message = useMessage()
const { createUser } = useUsers()
const { listPolicies, setUserOrGroupPolicy } = usePolicies()
const { listGroup, updateGroupMembers, getGroup } = useGroups()
const { $api } = useNuxtApp()

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
  // 存储从分组继承的策略，这些策略不可取消
  groupInheritedPolicies: [] as string[],
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
  editForm.groupInheritedPolicies = []
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
  } else if (!/^.{3,20}$/.test(editForm.accessKey)) {
    errors.accessKey = t('username length cannot be less than 3 characters and greater than 20 characters')
  }

  if (!editForm.secretKey.trim()) {
    errors.secretKey = t('Please enter password')
  } else if (!/^.{8,40}$/.test(editForm.secretKey)) {
    errors.secretKey = t('password length cannot be less than 8 characters and greater than 40 characters')
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

// 获取分组的策略
const getGroupPolicies = async (groupName: string) => {
  try {
    const groupInfo: { policy?: string } = await getGroup(groupName)
    return groupInfo.policy ? groupInfo.policy.split(',') : []
  } catch (error) {
    console.error('获取分组策略失败:', error)
    return []
  }
}

// 更新分组继承的策略
const updateGroupInheritedPolicies = async () => {
  // 清空当前的分组继承策略
  editForm.groupInheritedPolicies = []

  // 获取所有选中分组的策略
  if (editForm.groups.length > 0) {
    const promises = editForm.groups.map(group => getGroupPolicies(group))
    const results = await Promise.all(promises)

    // 合并所有分组的策略并去重
    const inheritedPolicies = Array.from(new Set(results.flat()))
    editForm.groupInheritedPolicies = inheritedPolicies
  }

  // 更新策略列表，确保分组继承的策略被选中且不可取消
  updateSelectedPolicies()
}

// 更新选中的策略，确保分组继承的策略被选中
const updateSelectedPolicies = () => {
  // 合并用户手动选择的策略和分组继承的策略
  const allPolicies = Array.from(new Set([...editForm.policies, ...editForm.groupInheritedPolicies]))
  editForm.policies = allPolicies
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

const toggleGroup = async (value: string) => {
  if (editForm.groups.includes(value)) {
    // 移除分组
    editForm.groups = editForm.groups.filter(item => item !== value)
  } else {
    // 添加分组
    editForm.groups = [...editForm.groups, value]
  }

  // 更新分组继承的策略
  await updateGroupInheritedPolicies()
}

const togglePolicy = (value: string) => {
  // 如果是分组继承的策略，不能取消选中
  if (editForm.groupInheritedPolicies.includes(value)) {
    return
  }

  if (editForm.policies.includes(value)) {
    editForm.policies = editForm.policies.filter(item => item !== value)
  } else {
    editForm.policies = [...editForm.policies, value]
  }
}
</script>
