<template>
  <div>
    <div class="mb-4 mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex w-full max-w-md items-center gap-2">
        <Input v-model="searchTerm" :placeholder="t('Search User Group')" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" :disabled="!checkedKeys.length" @click="allocationPolicy">
          <Icon class="size-4" name="ri:group-2-fill" />
          {{ t('Assign Policy') }}
        </Button>
        <Button type="button" variant="secondary" @click="addUserGroup">
          <Icon class="size-4" name="ri:add-line" />
          {{ t('Add User Group') }}
        </Button>
      </div>
    </div>
    <Table class="overflow-hidden rounded-lg border">
      <TableHeader>
        <TableRow>
          <TableHead class="w-10">
            <Checkbox
              :checked="headerCheckboxState"
              :disabled="!filteredGroups.length"
              aria-label="Select all groups"
              @update:checked="toggleAll"
            />
          </TableHead>
          <TableHead class="w-full">{{ t('Name') }}</TableHead>
          <TableHead class="w-40 text-center">{{ t('Actions') }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody v-if="filteredGroups.length">
        <TableRow v-for="row in filteredGroups" :key="rowKey(row)">
          <TableCell class="w-10">
            <Checkbox
              :checked="checkedKeys.includes(rowKey(row))"
              aria-label="Select group"
              @update:checked="(value: boolean) => toggleRow(rowKey(row), value)"
            />
          </TableCell>
          <TableCell class="font-medium">{{ row.name }}</TableCell>
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
    <users-group-edit ref="editItemRef"></users-group-edit>
    <users-group-new v-model:visible="newItemVisible" @search="getDataList" ref="newItemRef"></users-group-new>
    <users-group-set-policies-mutiple :checkedKeys="checkedKeys" @changePoliciesSuccess="changePoliciesSuccess" ref="policiesRef"></users-group-set-policies-mutiple>
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
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const dialog = useDialog()
const message = useMessage()
const group = useGroups()

interface GroupRow {
  name: string
}

const searchTerm = ref('')
const listData = ref<GroupRow[]>([])
const checkedKeys = ref<string[]>([])

const filteredGroups = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return listData.value
  return listData.value.filter(item => item.name.toLowerCase().includes(keyword))
})

const allSelected = computed(
  () => filteredGroups.value.length > 0 && filteredGroups.value.every(row => checkedKeys.value.includes(row.name))
)

const headerCheckboxState = computed(() => {
  if (!filteredGroups.value.length) return false
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
    const res = await group.listGroup()
    listData.value =
      res?.map((item: string) => ({
        name: item,
      })) || []
    const existingKeys = new Set(listData.value.map(item => item.name))
    checkedKeys.value = checkedKeys.value.filter(key => existingKeys.has(key))
  } catch (error) {
    message.error(t('Failed to get data'))
  }
}

/** **********************************添加 */
const newItemRef = ref()
const newItemVisible = ref(false)

function addUserGroup() {
  newItemVisible.value = true
}

/** **********************************分配策略 */
const policiesRef = ref()
const allocationPolicy = () => {
  policiesRef.value.openDialog()
}

const changePoliciesSuccess = () => {
  checkedKeys.value = []
}
/** **********************************修改 */
const editItemRef = ref()
function openEditItem(row: GroupRow) {
  editItemRef.value.openDialog(row)
}

/** ***********************************删除 */
async function deleteItem(row: GroupRow) {
  try {
    // 获取组的成员
    const info = await group.getGroup(row.name)
    if (info.members.length) {
      message.error('请先清空组成员')
      return
    }
    // 清空组的成员
    await group.updateGroupMembers({
      group: row.name,
      members: info.members,
      isRemove: true,
      groupStatus: 'enabled',
    })
    message.success(t('Delete Success'))
    await getDataList()
  } catch (error) {
    message.error(t('Delete Failed'))
  }
}

/** ************************************批量删除 */
function rowKey(row: GroupRow): string {
  return row.name
}

function deleteByList() {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete all selected user groups?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      if (!checkedKeys.value.length) {
        message.error(t('Please select at least one item'))
        return
      }
      try {
        await Promise.all(checkedKeys.value.map(element => group.removeGroup(element)))
        checkedKeys.value = []
        message.success(t('Delete Success'))
        await getDataList()
      } catch (error) {
        message.error(t('Delete Failed'))
      }
    },
  })
}

function toggleAll(value: boolean | 'indeterminate') {
  if (value === true || value === 'indeterminate') {
    checkedKeys.value = filteredGroups.value.map(item => item.name)
  } else if (value === false) {
    checkedKeys.value = []
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
