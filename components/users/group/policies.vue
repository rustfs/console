<template>
  <div class="space-y-4">
    <div v-if="!editStatus" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="w-full sm:max-w-xs">
        <Input v-model="searchTerm" :placeholder="t('Search Policy')" />
      </div>
      <Button variant="secondary" class="inline-flex items-center gap-2" @click="startEditing">
        <Icon class="size-4" name="ri:add-line" />
        {{ t('Edit Policy') }}
      </Button>
    </div>

    <div v-else class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex w-full flex-col gap-2">
        <Label class="text-sm font-medium">{{ t('Select user group policies') }}</Label>
        <Popover v-model:open="policySelectorOpen">
          <PopoverTrigger as-child>
            <Button
              type="button"
              variant="outline"
              class="min-h-10 justify-between gap-2"
              :aria-label="t('Select user group policies')"
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
                  >
                    <Icon
                      name="ri:check-line"
                      class="mr-2 size-4"
                      :class="selectedPolicies.includes(option.value) ? 'opacity-100' : 'opacity-0'"
                    />
                    <span>{{ option.label }}</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div v-if="selectedPolicies.length" class="flex flex-wrap gap-2">
          <Badge v-for="value in selectedPolicies" :key="value" variant="secondary">{{ value }}</Badge>
        </div>
      </div>
      <div class="flex items-center gap-2 sm:self-start">
        <Button variant="ghost" @click="cancelEditing">
          {{ t('Cancel') }}
        </Button>
        <Button variant="secondary" @click="changePolicies">
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
      <TableBody v-if="filteredPolicies.length">
        <TableRow v-for="policy in filteredPolicies" :key="policy">
          <TableCell class="font-medium">{{ policy }}</TableCell>
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
import { Input } from '@/components/ui/input'

import { Icon } from '#components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { listPolicies, setUserOrGroupPolicy } = usePolicies()
const { t } = useI18n()
const message = useMessage()

const props = defineProps<{
  group: {
    name: string
    policy?: string
  }
}>()

const emit = defineEmits<{ (e: 'search'): void }>()

const searchTerm = ref('')
const editStatus = ref(false)
const policySelectorOpen = ref(false)
const policies = ref<{ label: string; value: string }[]>([])
const selectedPolicies = ref<string[]>([])

const currentPolicies = computed(() => {
  if (!props.group?.policy) return []
  return props.group.policy.split(',').map(item => item.trim()).filter(Boolean)
})

const filteredPolicies = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  const source = currentPolicies.value
  if (!keyword) return source
  return source.filter(policy => policy.toLowerCase().includes(keyword))
})

const policyLabelMap = computed(() => {
  return policies.value.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label
    return acc
  }, {})
})

const selectedPolicyLabels = computed(() => selectedPolicies.value.map(value => policyLabelMap.value[value] ?? value))

watch(
  () => props.group?.policy,
  () => {
    if (!editStatus.value) {
      selectedPolicies.value = [...currentPolicies.value]
    }
  },
  { immediate: true }
)

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

onMounted(() => {
  loadPolicies()
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
    selectedPolicies.value = selectedPolicies.value.filter(item => item !== value)
  } else {
    selectedPolicies.value = [...selectedPolicies.value, value]
  }
}

const changePolicies = async () => {
  try {
    await setUserOrGroupPolicy({
      policyName: selectedPolicies.value,
      userOrGroup: props.group?.name ?? '',
      isGroup: true,
    })
    message.success(t('Edit Success'))
    editStatus.value = false
    policySelectorOpen.value = false
    emit('search')
  } catch (error) {
    message.error(t('Edit Failed'))
  }
}
</script>
