<template>
  <div class="space-y-4">
    <template v-if="!editStatus">
      <div class="space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="w-full sm:max-w-xs">
            <SearchInput v-model="searchTerm" :placeholder="t('Search Account')" clearable class="w-full" />
          </div>
          <Button variant="outline" class="inline-flex items-center gap-2" @click="addItem">
            <Icon class="size-4" name="ri:add-line" />
            {{ t('Add Account') }}
          </Button>
        </div>

        <DataTable :table="table" />
      </div>
    </template>

    <template v-else-if="editType === 'add'">
      <div class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel>{{ t('Access Key') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formModel.accessKey" autocomplete="off" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Secret Key') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formModel.secretKey" type="password" autocomplete="off" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Expiration') }}</FieldLabel>
            <FieldContent>
              <DateTimePicker
                v-model="formModel.expiry"
                :min="minExpiry"
                :placeholder="t('Please select expiration date')"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{{ t('Name') }}</FieldLabel>
            <FieldContent>
              <Input v-model="formModel.name" autocomplete="off" />
            </FieldContent>
          </Field>
          <Field class="md:col-span-2">
            <FieldLabel>{{ t('Description') }}</FieldLabel>
            <FieldContent>
              <Textarea v-model="formModel.description" :rows="3" />
            </FieldContent>
          </Field>
        </div>

        <Field orientation="responsive" class="items-start rounded-md border px-3 py-2">
          <FieldLabel class="space-y-1">
            <p class="text-sm font-medium">{{ t('Use main account policy') }}</p>
            <p class="text-xs text-muted-foreground">
              {{ t('Automatically inherit the main account policy when enabled.') }}
            </p>
          </FieldLabel>
          <FieldContent class="flex justify-end">
            <Switch v-model="formModel.impliedPolicy" />
          </FieldContent>
        </Field>

        <Field v-if="!formModel.impliedPolicy">
          <FieldLabel>{{ t('Current User Policy') }}</FieldLabel>
          <FieldContent>
            <json-editor v-model="formModel.policy" />
          </FieldContent>
        </Field>

        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="cancelAdd">{{ t('Cancel') }}</Button>
          <Button variant="default" :loading="submitting" @click="submitForm">{{ t('Submit') }}</Button>
        </div>
      </div>
    </template>

    <user-access-key-edit-form v-if="editStatus && editType === 'edit'" :user="editData" @search="handleEditFinished" />
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Icon } from '#components'
import DataTable from '@/components/data-table/data-table.vue'
import { useDataTable } from '@/components/data-table/useDataTable'
import DateTimePicker from '@/components/datetime-picker.vue'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { ColumnDef } from '@tanstack/vue-table'
import dayjs from 'dayjs'
import { computed, h, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDialog, useMessage } from '~/composables/ui'
import { makeRandomString } from '~/utils/functions'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const { listUserServiceAccounts, createServiceAccount, getServiceAccount, deleteServiceAccount } = useAccessKeys()
const { getPolicyByUserName } = usePolicies()

const props = defineProps<{
  user: {
    accessKey: string
  }
}>()

const emit = defineEmits<{
  (e: 'search'): void
  (e: 'notice', data: object): void
}>()

const searchTerm = ref('')
const listData = ref<any[]>([])
const editStatus = ref(false)
const editType = ref<'add' | 'edit'>('add')
const submitting = ref(false)
const formModel = reactive({
  accessKey: makeRandomString(20),
  secretKey: makeRandomString(40),
  name: '',
  description: '',
  impliedPolicy: true,
  expiry: null as string | null,
  policy: '',
  accountStatus: 'on',
})

const editData = ref<any>({})
const parentPolicy = ref('')

const minExpiry = computed(() => new Date().toISOString())

interface AccountItem {
  accessKey: string
  expiration?: string
  accountStatus?: string
  name?: string
  [key: string]: unknown
}

const columns: ColumnDef<AccountItem>[] = [
  {
    id: 'accessKey',
    header: () => t('Access Key'),
    cell: ({ row }) => h('span', { class: 'text-center font-medium' }, row.original.accessKey),
  },
  {
    id: 'expiration',
    header: () => t('Expiration'),
    cell: ({ row }) => h('span', { class: 'text-center' }, formatExpiration(row.original.expiration)),
  },
  {
    id: 'status',
    header: () => t('Status'),
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-sm text-center' },
        row.original.accountStatus === 'on' ? t('Available') : t('Disabled')
      ),
  },
  {
    id: 'name',
    header: () => t('Name'),
    cell: ({ row }) => h('span', { class: 'text-center' }, row.original.name || '-'),
  },
  {
    id: 'actions',
    header: () => t('Actions'),
    enableSorting: false,
    cell: ({ row }) =>
      h('div', { class: 'flex justify-center gap-2' }, [
        h(
          Button,
          {
            variant: 'outline',
            size: 'sm',
            class: 'h-8 w-8 p-0',
            onClick: () => openEditItem(row.original),
          },
          () => h(Icon, { class: 'size-4', name: 'ri:edit-2-line' })
        ),
        h(
          Button,
          {
            variant: 'outline',
            size: 'sm',
            class: 'h-8 w-8 p-0 text-destructive border-destructive',
            onClick: () => confirmDelete(row.original),
          },
          () => h(Icon, { class: 'size-4', name: 'ri:delete-bin-5-line' })
        ),
      ]),
  },
]

const { table } = useDataTable<AccountItem>({
  data: listData as any,
  columns,
  getRowId: row => row.accessKey,
})

watch(searchTerm, value => {
  table.getColumn('accessKey')?.setFilterValue(value || undefined)
})

const formatExpiration = (value?: string) => {
  if (!value) return '-'
  const date = dayjs(value)
  if (!date.isValid()) return '-'
  return date.format('YYYY-MM-DD HH:mm')
}

const resetForm = () => {
  formModel.accessKey = makeRandomString(20)
  formModel.secretKey = makeRandomString(40)
  formModel.name = ''
  formModel.description = ''
  formModel.impliedPolicy = true
  formModel.expiry = null
  formModel.policy = parentPolicy.value
  formModel.accountStatus = 'on'
}

const loadAccounts = async () => {
  if (!props.user?.accessKey) return
  const res = await listUserServiceAccounts({ user: props.user.accessKey })
  listData.value = res?.accounts ?? []
}

const loadParentPolicy = async () => {
  if (!props.user?.accessKey) return
  const policy = await getPolicyByUserName(props.user.accessKey)
  parentPolicy.value = JSON.stringify(policy ?? {})
  if (formModel.impliedPolicy) {
    formModel.policy = parentPolicy.value
  }
}

watch(
  () => props.user.accessKey,
  () => {
    loadAccounts()
    loadParentPolicy()
  },
  { immediate: true }
)

watch(
  () => formModel.impliedPolicy,
  implied => {
    if (implied) {
      formModel.policy = parentPolicy.value
    }
  }
)

const addItem = () => {
  editType.value = 'add'
  editStatus.value = true
  resetForm()
}

const openEditItem = async (row: any) => {
  editType.value = 'edit'
  editStatus.value = true
  const res = await getServiceAccount(row.accessKey)
  editData.value = { ...res, accessKey: row.accessKey }
}

const cancelAdd = () => {
  editStatus.value = false
  submitting.value = false
  resetForm()
  loadAccounts()
}

const handleEditFinished = () => {
  editStatus.value = false
  loadAccounts()
  emit('search')
}

const validateForm = () => {
  if (!formModel.accessKey.trim()) {
    message.error(t('Please enter Access Key'))
    return false
  }
  if (formModel.accessKey.length < 3 || formModel.accessKey.length > 20) {
    message.error(t('Access Key length must be between 3 and 20 characters'))
    return false
  }
  if (!formModel.secretKey.trim()) {
    message.error(t('Please enter Secret Key'))
    return false
  }
  if (formModel.secretKey.length < 8 || formModel.secretKey.length > 40) {
    message.error(t('Secret Key length must be between 8 and 40 characters'))
    return false
  }
  if (!formModel.expiry) {
    message.error(t('Please select expiration date'))
    return false
  }
  if (!formModel.impliedPolicy) {
    try {
      JSON.parse(formModel.policy || '{}')
    } catch {
      message.error(t('Policy format invalid'))
      return false
    }
  }
  return true
}

const submitForm = async () => {
  if (editType.value === 'edit') {
    // 交由 user-acedit 处理
    return
  }

  if (!validateForm()) {
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...formModel,
      targetUser: props.user.accessKey,
      policy: formModel.impliedPolicy ? null : JSON.stringify(JSON.parse(formModel.policy || '{}')),
      expiration: formModel.expiry ? new Date(formModel.expiry).toISOString() : null,
    }
    const res = await createServiceAccount(payload)
    message.success(t('Add Success'))
    cancelAdd()
    emit('search')
    emit('notice', res)
    loadAccounts()
  } catch (error) {
    console.error(error)
    message.error(t('Add Failed'))
    submitting.value = false
  }
}

const confirmDelete = (row: any) => {
  dialog.warning({
    title: t('Warning'),
    content: t('Confirm Delete'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: () => deleteItem(row),
  })
}

const deleteItem = async (row: any) => {
  try {
    await deleteServiceAccount(row.accessKey)
    message.success(t('Delete Success'))
    loadAccounts()
  } catch (error) {
    message.error(t('Delete Failed'))
  }
}
</script>
