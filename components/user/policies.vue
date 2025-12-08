<template>
  <div class="space-y-4">
    <div v-if="!editStatus" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="w-full sm:max-w-xs">
        <SearchInput v-model="searchTerm" :placeholder="t('Search Policy')" clearable class="max-w-xs" />
      </div>
      <Button variant="outline" class="inline-flex items-center gap-2" @click="startEditing">
        <Icon class="size-4" name="ri:add-line" />
        {{ t('Edit Policy') }}
      </Button>
    </div>

    <div v-else class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <Field class="flex w-full flex-col gap-2">
        <FieldLabel class="text-sm font-medium">{{ t('Select Group') }}</FieldLabel>
        <FieldContent class="space-y-2">
          <Popover v-model:open="policySelectorOpen">
            <PopoverTrigger as-child>
              <Button
                type="button"
                variant="outline"
                class="min-h-10 justify-between gap-2"
                :aria-label="t('Select Group')"
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
                      v-for="option in policies"
                      :key="option.value"
                      :value="option.label"
                      @select="() => togglePolicy(option.value)"
                      :disabled="inheritedPolicies.includes(option.value) && selectedPolicies.includes(option.value)"
                      class="group"
                    >
                      <Icon
                        name="ri:check-line"
                        class="mr-2 size-4"
                        :class="selectedPolicies.includes(option.value) ? 'opacity-100' : 'opacity-0'"
                      />
                      <span>{{ option.label }}</span>
                      <span
                        v-if="inheritedPolicies.includes(option.value)"
                        class="ml-2 text-xs text-muted-foreground opacity-70 transition-opacity"
                      >
                        {{ t('(Inherited from group)') }}
                      </span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </FieldContent>
      </Field>
      <div class="flex items-center gap-2 sm:self-end">
        <Button variant="ghost" @click="cancelEditing">
          {{ t('Cancel') }}
        </Button>
        <Button variant="outline" :loading="submitting" @click="changePolicies">
          {{ t('Submit') }}
        </Button>
      </div>
    </div>
    <div v-if="selectedPolicies.length" class="flex flex-wrap gap-2">
      <Badge v-for="value in selectedPolicies" :key="value" variant="secondary">{{ value }}</Badge>
    </div>

    <DataTable :table="table" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ColumnDef } from '@tanstack/vue-table'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGroups } from '@/composables/useGroups'

const { listPolicies, setUserOrGroupPolicy, getPolicyByUserName } = usePolicies()
const { listGroup } = useGroups()
const { t } = useI18n()
const message = useMessage()

// 存储用户继承的策略
const inheritedPolicies = ref<string[]>([])

// 获取用户继承的策略
const loadInheritedPolicies = async () => {
  if (!props.user?.accessKey) return
  try {
    const userPolicies = await getPolicyByUserName(props.user.accessKey)
    if (userPolicies?.Statement) {
      // 提取来自组的继承策略
      const inheritedPolicyNames = new Set<string>()
      userPolicies.Statement.forEach((statement: any) => {
        if (statement.Origin?.type === 'group' || statement.Origin?.type === 'both') {
          // 如果策略来自组或同时来自组和直接分配，将其添加到继承策略列表
          if (statement.Origin?.policyName) {
            inheritedPolicyNames.add(statement.Origin.policyName)
          }
        }
      })
      inheritedPolicies.value = Array.from(inheritedPolicyNames)
    }
  } catch (error) {
    console.error('Failed to load inherited policies:', error)
  }
}

const props = defineProps<{
  user: {
    accessKey: string
    policy?: string[]
  }
}>()

const emit = defineEmits<{ (e: 'search'): void }>()

const searchTerm = ref('')
const editStatus = ref(false)
const policySelectorOpen = ref(false)
const policies = ref<{ label: string; value: string }[]>([])
const selectedPolicies = ref<string[]>([])
const submitting = ref(false)

const currentPolicies = computed(() => props.user.policy ?? [])

interface PolicyItem {
  name: string
}

const policiesData = computed<PolicyItem[]>(() => currentPolicies.value.map(name => ({ name })))

const columns: ColumnDef<PolicyItem>[] = [
  {
    id: 'name',
    header: () => t('Name'),
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
  },
]

const { table } = useDataTable<PolicyItem>({
  data: policiesData,
  columns,
  getRowId: row => row.name,
})

watch(searchTerm, value => {
  table.getColumn('name')?.setFilterValue(value || undefined)
})

const policyLabelMap = computed(() => {
  return policies.value.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label
    return acc
  }, {})
})

const selectedPolicyLabels = computed(() => selectedPolicies.value.map(value => policyLabelMap.value[value] ?? value))

const loadPolicies = async () => {
  try {
    const res = await listPolicies()
    policies.value = Object.keys(res ?? {})
      .sort((a, b) => a.localeCompare(b))
      .map(key => ({
        label: key,
        value: key,
      }))
  } catch (error) {
    message.error(t('Failed to get data'))
  }
}

onMounted(async () => {
  await loadPolicies()
  selectedPolicies.value = [...currentPolicies.value]
  await loadInheritedPolicies()
})

watch(
  () => props.user.policy,
  () => {
    if (!editStatus.value) {
      selectedPolicies.value = [...currentPolicies.value]
    }
  },
  { immediate: true }
)

watch(editStatus, async val => {
  if (val) {
    await loadInheritedPolicies()
  }
})

const startEditing = () => {
  selectedPolicies.value = [...currentPolicies.value]
  policySelectorOpen.value = false
  editStatus.value = true
}

const cancelEditing = () => {
  selectedPolicies.value = [...currentPolicies.value]
  policySelectorOpen.value = false
  editStatus.value = false
}

const togglePolicy = (value: string) => {
  if (selectedPolicies.value.includes(value)) {
    // 如果是继承的策略，禁止删除
    if (inheritedPolicies.value.includes(value)) {
      // 不再显示弹出消息，而是通过UI禁用删除功能
      return
    }
    selectedPolicies.value = selectedPolicies.value.filter(item => item !== value)
  } else {
    // 确保添加的策略不重复
    if (!selectedPolicies.value.includes(value)) {
      selectedPolicies.value = [...selectedPolicies.value, value]
    }
  }
}

const changePolicies = async () => {
  if (!props.user?.accessKey) return
  submitting.value = true
  try {
    await setUserOrGroupPolicy({
      policyName: selectedPolicies.value,
      userOrGroup: props.user.accessKey,
      isGroup: false,
    })
    message.success(t('Edit Success'))
    editStatus.value = false
    policySelectorOpen.value = false
    emit('search')
  } catch (error) {
    message.error(t('Edit Failed'))
  } finally {
    submitting.value = false
  }
}
</script>
