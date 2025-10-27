<template>
  <div>
    <div class="mb-4 mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex w-full max-w-md items-center gap-2">
        <Input v-model="searchTerm" :placeholder="t('Search Access User')" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          :disabled="!checkedKeys.length"
          @click="deleteByList"
        >
          <Icon class="size-4" name="ri:delete-bin-5-line" />
          {{ t('Delete Selected') }}
        </Button>
        <Button
          type="button"
          variant="secondary"
          :disabled="!checkedKeys.length"
          @click="addToGroup"
        >
          <Icon class="size-4" name="ri:group-2-fill" />
          {{ t('Add to Group') }}
        </Button>
        <Button type="button" variant="secondary" @click="addUserItem">
          <Icon class="size-4" name="ri:add-line" />
          {{ t('Add User') }}
        </Button>
      </div>
    </div>
    <Table class="overflow-hidden rounded-lg border">
      <TableHeader>
        <TableRow>
          <TableHead class="w-10">
            <Checkbox
              :checked="headerCheckboxState"
              :disabled="!filteredUsers.length"
              aria-label="Select all users"
              @update:checked="toggleAll"
            />
          </TableHead>
          <TableHead class="w-full">{{ t('Name') }}</TableHead>
          <TableHead class="w-40 text-center">{{ t('Actions') }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody v-if="filteredUsers.length">
        <TableRow v-for="row in filteredUsers" :key="rowKey(row)">
          <TableCell class="w-10">
            <Checkbox
              :checked="checkedKeys.includes(rowKey(row))"
              aria-label="Select user"
              @update:checked="(value: boolean) => toggleRow(rowKey(row), value)"
            />
          </TableCell>
          <TableCell class="font-medium">{{ row.accessKey }}</TableCell>
          <TableCell>
            <div class="flex items-center justify-center gap-2">
              <Button type="button" size="sm" variant="secondary" @click="openEditItem(row)">
                <Icon class="size-4" name="ri:edit-2-line" />
                {{ t('Edit') }}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger as-child>
                  <Button type="button" size="sm" variant="secondary">
                    <Icon class="size-4" name="ri:delete-bin-5-line" />
                    {{ t('Delete') }}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{{ t('Confirm Delete') }}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{{ t('Cancel') }}</AlertDialogCancel>
                    <AlertDialogAction @click="() => deleteItem(row)">
                      {{ t('Delete') }}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
      <TableBody v-else>
        <TableRow>
          <TableCell class="text-center" colspan="3">
            <p class="py-6 text-sm text-muted-foreground">{{ t('No Data') }}</p>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <users-user-new @search="getDataList" ref="newItemRef"></users-user-new>
    <users-user-edit @search="getDataList" :checkedKeys="checkedKeys" ref="editItemRef"></users-user-edit>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { listUsers, deleteUser } = useUsers()
const dialog = useDialog()
const message = useMessage()

interface UserRow {
  accessKey: string
  [key: string]: unknown
}

const searchTerm = ref('')
const listData = ref<UserRow[]>([])
const checkedKeys = ref<string[]>([])

const filteredUsers = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return listData.value
  return listData.value.filter(item => item.accessKey.toLowerCase().includes(keyword))
})

const allSelected = computed(
  () => filteredUsers.value.length > 0 && filteredUsers.value.every(row => checkedKeys.value.includes(row.accessKey))
)

const headerCheckboxState = computed(() => {
  if (!filteredUsers.value.length) return false
  if (allSelected.value) return true
  if (checkedKeys.value.length) return 'indeterminate'
  return false
})

onMounted(() => {
  getDataList()
})

// 获取数据
const getDataList = async () => {
  try {
    const res = await listUsers()

    listData.value = Object.entries(res).map(([username, info]) => ({
      accessKey: username, // 添加用户名
      ...(typeof info === 'object' ? info : {}), // 展开用户信息
    }))
    const existingKeys = new Set(listData.value.map(item => item.accessKey))
    checkedKeys.value = checkedKeys.value.filter(key => existingKeys.has(key))
  } catch (error) {
    message.error(t('Failed to get data'))
  }
}

/** **********************************添加 */
const newItemRef = ref()

function addUserItem() {
  newItemRef.value.openDialog()
}

/** **********************************添加到的分组 */
const addToGroup = () => { }

/** **********************************修改 */
const editItemRef = ref()
function openEditItem(row: any) {
  editItemRef.value.openDialog(row)
}
/** ***********************************删除 */
async function deleteItem(row: any) {
  try {
    await deleteUser(row.accessKey)
    message.success(t('Delete Success'))
    getDataList()
  } catch (error) {
    message.error(t('Delete Failed'))
  }
}

/** ************************************批量删除 */
function rowKey(row: any): string {
  return row.accessKey
}

function deleteByList() {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete all selected users?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      if (!checkedKeys.value.length) {
        message.error(t('Please select at least one item'))
        return
      }
      try {
        // 循环遍历删除
        await Promise.all(checkedKeys.value.map(item => deleteUser(item)))
        checkedKeys.value = []
        message.success(t('Delete Success'))
        nextTick(() => {
          getDataList()
        })
      } catch (error) {
        message.error(t('Delete Failed'))
      }
    },
  })
}

function toggleAll(value: boolean | 'indeterminate') {
  if (value === true) {
    checkedKeys.value = filteredUsers.value.map(item => item.accessKey)
  } else if (value === false) {
    checkedKeys.value = []
  } else if (value === 'indeterminate') {
    checkedKeys.value = filteredUsers.value.map(item => item.accessKey)
  }
}

function toggleRow(key: string, value: boolean | 'indeterminate') {
  if (value === true || value === 'indeterminate') {
    if (!checkedKeys.value.includes(key)) {
      checkedKeys.value = [...checkedKeys.value, key]
    }
  } else {
    checkedKeys.value = checkedKeys.value.filter(item => item !== key)
  }
}
</script>

<style lang="scss" scoped></style>
