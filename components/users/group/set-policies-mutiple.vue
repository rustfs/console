<template>
  <AppModal v-model="visible" :title="t('Batch allocation policies')" size="xl" :close-on-backdrop="false">
    <AppCard padded class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="w-full sm:max-w-xs">
          <Input v-model="searchTerm" :placeholder="t('Search Policy')" />
        </div>
        <Button variant="secondary" :disabled="!checkedKeys.length || submitting" @click="changePolicies">
          {{ t('Submit') }}
        </Button>
      </div>

      <Table class="overflow-hidden rounded-lg border">
        <TableHeader>
          <TableRow>
            <TableHead class="w-12">
              <AppCheckbox
                :checked="allVisibleSelected"
                :indeterminate="checkedKeys.length > 0 && !allVisibleSelected"
                @update:checked="toggleSelectAll"
              />
            </TableHead>
            <TableHead>{{ t('Name') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody v-if="filteredPolicies.length">
          <TableRow v-for="policy in filteredPolicies" :key="policy.name">
            <TableCell>
              <AppCheckbox
                :checked="isSelected(policy.name)"
                @update:checked="(value: boolean) => toggleSelection(policy.name, value)"
              />
            </TableCell>
            <TableCell class="font-medium">{{ policy.name }}</TableCell>
          </TableRow>
        </TableBody>
        <TableBody v-else>
          <TableRow>
            <TableCell class="text-center" colspan="2">
              <p class="py-6 text-sm text-muted-foreground">{{ t('No Data') }}</p>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </AppCard>
  </AppModal>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { AppCard, AppCheckbox, AppModal } from '@/components/app'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { listPolicies, setUserOrGroupPolicy } = usePolicies()
const { t } = useI18n()
const message = useMessage()

const props = defineProps<{
  checkedKeys: string[]
}>()

const emit = defineEmits<{
  (e: 'changePoliciesSuccess'): void
}>()

const visible = ref(false)
const searchTerm = ref('')
const submitting = ref(false)
const policies = ref<{ name: string; content: unknown }[]>([])
const checkedKeys = ref<string[]>([])

const filteredPolicies = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return policies.value
  return policies.value.filter(policy => policy.name.toLowerCase().includes(keyword))
})

const allVisibleSelected = computed(() => {
  const visibleNames = filteredPolicies.value.map(item => item.name)
  if (!visibleNames.length) return false
  return visibleNames.every(name => checkedKeys.value.includes(name))
})

const isSelected = (name: string) => checkedKeys.value.includes(name)

const toggleSelection = (name: string, checked: boolean) => {
  if (checked) {
    if (!checkedKeys.value.includes(name)) {
      checkedKeys.value = [...checkedKeys.value, name]
    }
  } else {
    checkedKeys.value = checkedKeys.value.filter(item => item !== name)
  }
}

const toggleSelectAll = (checked: boolean) => {
  const visibleNames = filteredPolicies.value.map(item => item.name)
  if (!visibleNames.length) return
  if (checked) {
    const merged = new Set([...checkedKeys.value, ...visibleNames])
    checkedKeys.value = Array.from(merged)
  } else {
    checkedKeys.value = checkedKeys.value.filter(name => !visibleNames.includes(name))
  }
}

const loadPolicies = async () => {
  try {
    const res = await listPolicies()
    policies.value = Object.keys(res ?? {})
      .sort((a, b) => a.localeCompare(b))
      .map(key => ({
        name: key,
        content: res[key],
      }))
  } catch (error) {
    message.error(t('Failed to get data'))
  }
}

const openDialog = async () => {
  visible.value = true
  checkedKeys.value = []
  searchTerm.value = ''
  await loadPolicies()
}

const changePolicies = async () => {
  if (!checkedKeys.value.length) return
  submitting.value = true
  try {
    await Promise.all(
      props.checkedKeys.map(item =>
        setUserOrGroupPolicy({
          policyName: checkedKeys.value,
          userOrGroup: item,
          isGroup: true,
        })
      )
    )
    message.success(t('Edit Success'))
    visible.value = false
    emit('changePoliciesSuccess')
  } catch (error) {
    message.error(t('Edit Failed'))
  } finally {
    submitting.value = false
  }
}

defineExpose({
  openDialog,
})
</script>