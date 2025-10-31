<script setup lang="ts">
import { Icon } from '#components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUsers } from '@/composables/useUsers'
import { useMessage } from '@/composables/ui'

interface UserOption {
  label: string
  value: string
}

interface Props {
  modelValue: string[]
  label?: string
  placeholder?: string
  showBadges?: boolean
  disabled?: boolean
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  placeholder: undefined,
  showBadges: true,
  disabled: false,
  autoLoad: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { t } = useI18n()
const message = useMessage()
const { listUsers } = useUsers()

const selectorOpen = ref(false)
const users = ref<UserOption[]>([])

const displayLabel = computed(() => props.label || t('Users'))
const displayPlaceholder = computed(() => props.placeholder || t('Select user group members'))

const userLabelMap = computed(() => {
  return users.value.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label
    return acc
  }, {})
})

const selectedUserLabels = computed(() => {
  return props.modelValue.map(value => userLabelMap.value[value] ?? value)
})

const loadUsers = async () => {
  if (!props.autoLoad) return

  try {
    const res = await listUsers()
    users.value = Object.entries(res ?? {}).map(([username, info]) => ({
      label: username,
      value: username,
      ...(typeof info === 'object' ? info : {}),
    }))
  } catch (error) {
    message.error(t('Failed to get data'))
  }
}

const toggleUser = (value: string) => {
  const currentValue = [...props.modelValue]
  if (currentValue.includes(value)) {
    emit(
      'update:modelValue',
      currentValue.filter(item => item !== value)
    )
  } else {
    emit('update:modelValue', [...currentValue, value])
  }
}

onMounted(() => {
  if (props.autoLoad) {
    loadUsers()
  }
})

defineExpose({
  loadUsers,
  users,
})
</script>

<template>
  <Field>
    <FieldLabel class="text-sm font-medium">{{ displayLabel }}</FieldLabel>
    <FieldContent class="space-y-2">
      <Popover v-model:open="selectorOpen">
        <PopoverTrigger as-child>
          <Button
            type="button"
            variant="outline"
            class="min-h-10 w-full justify-between gap-2"
            :disabled="disabled"
            :aria-label="displayLabel"
          >
            <span class="truncate">
              {{ selectedUserLabels.length ? selectedUserLabels.join(', ') : displayPlaceholder }}
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
                  @select="() => toggleUser(option.value)"
                >
                  <Icon
                    name="ri:check-line"
                    class="mr-2 size-4"
                    :class="modelValue.includes(option.value) ? 'opacity-100' : 'opacity-0'"
                  />
                  <span>{{ option.label }}</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div v-if="showBadges && modelValue.length" class="flex flex-wrap gap-2">
        <Badge v-for="value in modelValue" :key="value" variant="secondary">
          {{ userLabelMap[value] ?? value }}
        </Badge>
      </div>
    </FieldContent>
  </Field>
</template>
