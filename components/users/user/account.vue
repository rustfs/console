<template>
  <div class="space-y-4">
    <template v-if="!editStatus">
      <AppCard padded class="space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="w-full sm:max-w-xs">
            <AppInput v-model="searchTerm" :placeholder="t('Search Account')" />
          </div>
          <AppButton variant="secondary" class="inline-flex items-center gap-2" @click="addItem">
            <Icon class="size-4" name="ri:add-line" />
            {{ t('Add Account') }}
          </AppButton>
        </div>

        <Table class="overflow-hidden rounded-lg border">
          <TableHeader>
            <TableRow>
              <TableHead class="text-center">{{ t('Access Key') }}</TableHead>
              <TableHead class="text-center">{{ t('Expiration') }}</TableHead>
              <TableHead class="text-center">{{ t('Status') }}</TableHead>
              <TableHead class="text-center">{{ t('Name') }}</TableHead>
              <TableHead class="w-32 text-center">{{ t('Actions') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody v-if="filteredAccounts.length">
            <TableRow v-for="account in filteredAccounts" :key="account.accessKey">
              <TableCell class="text-center font-medium">{{ account.accessKey }}</TableCell>
              <TableCell class="text-center">{{ formatExpiration(account.expiration) }}</TableCell>
              <TableCell class="text-center">
                <span class="text-sm">
                  {{ account.accountStatus === 'on' ? t('Available') : t('Disabled') }}
                </span>
              </TableCell>
              <TableCell class="text-center">{{ account.name || '-' }}</TableCell>
              <TableCell>
                <div class="flex justify-center gap-2">
                  <AppButton variant="ghost" size="sm" class="h-8 w-8 p-0" @click="openEditItem(account)">
                    <Icon class="size-4" name="ri:edit-2-line" />
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    size="sm"
                    class="h-8 w-8 p-0 text-destructive"
                    @click="confirmDelete(account)"
                  >
                    <Icon class="size-4" name="ri:delete-bin-5-line" />
                  </AppButton>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
          <TableBody v-else>
            <TableRow>
              <TableCell class="text-center" colspan="5">
                <p class="py-6 text-sm text-muted-foreground">{{ t('No Data') }}</p>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </AppCard>
    </template>

    <template v-else-if="editType === 'add'">
      <AppCard padded class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label>{{ t('Access Key') }}</Label>
            <AppInput v-model="formModel.accessKey" autocomplete="off" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('Secret Key') }}</Label>
            <AppInput v-model="formModel.secretKey" type="password" autocomplete="off" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('Expiration') }}</Label>
            <AppDateTimePicker v-model="formModel.expiry" :min="minExpiry" :placeholder="t('Please select expiration date')" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('Name') }}</Label>
            <AppInput v-model="formModel.name" autocomplete="off" />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>{{ t('Description') }}</Label>
            <AppTextarea v-model="formModel.description" :rows="3" />
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <div>
              <p class="text-sm font-medium">{{ t('Use main account policy') }}</p>
              <p class="text-xs text-muted-foreground">
                {{ t('Automatically inherit the main account policy when enabled.') }}
              </p>
            </div>
            <AppSwitch v-model="formModel.impliedPolicy" />
          </div>
        </div>

        <div v-if="!formModel.impliedPolicy" class="space-y-2">
          <Label>{{ t('Current User Policy') }}</Label>
          <json-editor v-model="formModel.policy" />
        </div>

        <div class="flex justify-end gap-2">
          <AppButton variant="outline" @click="cancelAdd">{{ t('Cancel') }}</AppButton>
          <AppButton variant="primary" :loading="submitting" @click="submitForm">{{ t('Submit') }}</AppButton>
        </div>
      </AppCard>
    </template>

    <users-user-acedit
      v-if="editStatus && editType === 'edit'"
      :user="editData"
      @search="handleEditFinished"
    />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { AppButton, AppCard, AppDateTimePicker, AppInput, AppSwitch, AppTextarea } from '@/components/app'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import dayjs from 'dayjs'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { makeRandomString } from '~/utils/functions'
import { useDialog, useMessage } from '~/composables/ui'

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

const filteredAccounts = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return listData.value
  return listData.value.filter((item: any) => item.accessKey.toLowerCase().includes(keyword))
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
    // 交由 users-user-acedit 处理
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
