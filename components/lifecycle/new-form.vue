<template>
  <AppModal
    v-model="visible"
    :title="`${t('Add Lifecycle Rule')} (${t('Bucket')}: ${bucketName})`"
    size="lg"
    :close-on-backdrop="false"
  >
    <div class="space-y-6">
      <Tabs v-model="activeTab" class="flex flex-col gap-4">
        <TabsList class="w-full justify-start overflow-x-auto">
          <TabsTrigger value="expire">{{ t('Expiration') }}</TabsTrigger>
          <TabsTrigger value="transition">{{ t('Transition') }}</TabsTrigger>
        </TabsList>

        <TabsContent value="expire" class="mt-0 space-y-6">
          <AppCard padded class="space-y-4">
            <div v-if="versioningStatus" class="grid gap-2">
              <Label>{{ t('Object Version') }}</Label>
              <AppSelect v-model="formData.versionType" :options="versionOptions" />
            </div>

            <div class="grid gap-2">
              <Label>{{ t('Time Cycle') }}</Label>
              <div class="flex items-center gap-3">
                <Input
                  v-model="formData.days"
                  type="number"
                  min="1"
                  class="w-32"
                  :placeholder="t('Days')"
                />
                <span class="text-sm text-muted-foreground">{{ t('Days After') }}</span>
              </div>
            </div>
          </AppCard>

          <AppCard padded class="space-y-4">
            <details>
              <summary class="cursor-pointer text-sm font-medium text-primary">{{ t('More Configurations') }}</summary>
              <div class="mt-4 space-y-4">
                <div class="grid gap-2">
                  <Label>{{ t('Prefix') }}</Label>
                  <Input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
                </div>

                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <Label class="text-sm font-medium">{{ t('Tags') }}</Label>
                    <Button variant="outline" size="sm" @click="addTag">
                      <Icon name="ri:add-line" class="size-4" />
                      {{ t('Add Tag') }}
                    </Button>
                  </div>
                  <div v-if="formData.tags.length" class="space-y-3">
                    <div
                      v-for="(tag, index) in formData.tags"
                      :key="index"
                      class="grid gap-2 rounded-md border p-3 md:grid-cols-2 md:items-center md:gap-4"
                    >
                      <Input v-model="tag.key" :placeholder="t('Tag Name')" />
                      <div class="flex items-center gap-2">
                        <Input v-model="tag.value" :placeholder="t('Tag Value')" class="flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          class="text-destructive"
                          :disabled="formData.tags.length === 1"
                          @click="removeTag(index)"
                        >
                          <Icon name="ri:delete-bin-line" class="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </AppCard>

          <AppCard v-if="formData.versionType === 'current'" padded>
            <details>
              <summary class="cursor-pointer text-sm font-medium text-primary">{{ t('Advanced Settings') }}</summary>
              <div class="mt-4 flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">{{ t('Delete Marker Handling') }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ t('If no versions remain, delete references to this object') }}
                  </p>
                </div>
                <AppSwitch v-model="formData.expiredDeleteMark" />
              </div>
            </details>
          </AppCard>
        </TabsContent>

        <TabsContent value="transition" class="mt-0 space-y-6">
          <AppCard padded class="space-y-4">
            <div v-if="versioningStatus" class="grid gap-2">
              <Label>{{ t('Object Version') }}</Label>
              <AppSelect v-model="formData.versionType" :options="versionOptions" />
            </div>

            <div class="grid gap-2">
              <Label>{{ t('Time Cycle') }}</Label>
              <div class="flex items-center gap-3">
                <Input
                  v-model="formData.days"
                  type="number"
                  min="1"
                  class="w-32"
                  :placeholder="t('Days')"
                />
                <span class="text-sm text-muted-foreground">{{ t('Days After') }}</span>
              </div>
            </div>

            <div class="grid gap-2">
              <Label>{{ t('Storage Type') }}</Label>
              <AppSelect
                v-model="formData.storageType"
                :options="tiers"
                :placeholder="t('Please select storage type')"
              />
            </div>
          </AppCard>

          <AppCard padded class="space-y-4">
            <details>
              <summary class="cursor-pointer text-sm font-medium text-primary">{{ t('More Configurations') }}</summary>
              <div class="mt-4 space-y-4">
                <div class="grid gap-2">
                  <Label>{{ t('Prefix') }}</Label>
                  <Input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
                </div>

                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <Label class="text-sm font-medium">{{ t('Tags') }}</Label>
                    <Button variant="outline" size="sm" @click="addTag">
                      <Icon name="ri:add-line" class="size-4" />
                      {{ t('Add Tag') }}
                    </Button>
                  </div>
                  <div v-if="formData.tags.length" class="space-y-3">
                    <div
                      v-for="(tag, index) in formData.tags"
                      :key="index"
                      class="grid gap-2 rounded-md border p-3 md:grid-cols-2 md:items-center md:gap-4"
                    >
                      <Input v-model="tag.key" :placeholder="t('Tag Name')" />
                      <div class="flex items-center gap-2">
                        <Input v-model="tag.value" :placeholder="t('Tag Value')" class="flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          class="text-destructive"
                          :disabled="formData.tags.length === 1"
                          @click="removeTag(index)"
                        >
                          <Icon name="ri:delete-bin-line" class="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </AppCard>
        </TabsContent>
      </Tabs>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="handleCancel">{{ t('Cancel') }}</Button>
        <Button variant="default" :loading="submitting" @click="handleSave">{{ t('Save') }}</Button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { Icon } from '#components'
import { AppCard, AppModal, AppSelect, AppSwitch } from '@/components/app'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const { putBucketLifecycleConfiguration, getBucketVersioning, getBucketLifecycleConfiguration } = useBucket({})
const { listTiers } = useTiers()

const props = defineProps<{
  bucketName: string
}>()

const emit = defineEmits<{
  (e: 'search'): void
}>()

const visible = ref(false)
const activeTab = ref<'expire' | 'transition'>('expire')
const submitting = ref(false)
const versioningStatus = ref(false)

const versionOptions = computed(() => [
  { label: t('Current Version'), value: 'current' },
  { label: t('Non-current Version'), value: 'non-current' },
])

const formData = reactive({
  versionType: 'current',
  days: 1,
  storageType: '',
  prefix: '',
  expiredDeleteMark: false,
  tags: [
    {
      key: '',
      value: '',
    },
  ] as Array<{ key: string; value: string }>,
})

watch(
  () => activeTab.value,
  value => {
    formState.action = value === 'expire' ? 'expire' : 'transition'
  },
  { immediate: true }
)

const formState = reactive({
  action: 'expire' as 'expire' | 'transition',
})

const tiers = ref<Array<{ label: string; value: string }>>([])

const loadTiers = async () => {
  const res = await listTiers()
  if (res) {
    tiers.value = res.map((item: any) => ({
      label: item[item.type].name,
      value: item[item.type].name,
    }))
  }
  if (!formData.storageType && tiers.value.length > 0) {
    formData.storageType = tiers.value[0]?.value ?? ''
  }
}

const loadVersioningStatus = async () => {
  if (!props.bucketName) return
  try {
    const resp = await getBucketVersioning(props.bucketName)
    versioningStatus.value = resp.Status === 'Enabled'
  } catch (error) {
    versioningStatus.value = false
  }
}

watch(
  () => props.bucketName,
  () => {
    loadVersioningStatus()
  }
)

const addTag = () => {
  formData.tags.push({ key: '', value: '' })
}

const removeTag = (index: number) => {
  if (formData.tags.length === 1) return
  formData.tags.splice(index, 1)
}

const resetForm = () => {
  activeTab.value = 'expire'
  formState.action = 'expire'
  formData.versionType = 'current'
  formData.days = 1
  formData.storageType = tiers.value[0]?.value ?? ''
  formData.prefix = ''
  formData.expiredDeleteMark = false
  formData.tags = [{ key: '', value: '' }]
}

const validate = () => {
  if (!formData.days || Number(formData.days) < 1) {
    message.error(t('Please enter valid days'))
    return false
  }

  if (
    formState.action === 'transition' &&
    (!formData.storageType || formData.storageType === '')
  ) {
    message.error(t('Please select storage type'))
    return false
  }

  if (!formData.tags.some(tag => tag.key && tag.value)) {
    // allow but no error
  }

  return true
}

const randomUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const buildFilter = () => {
  const validTags = formData.tags.filter(tag => tag.key && tag.value)
  if (!formData.prefix && validTags.length === 0) {
    return undefined
  }

  const filter: any = {}
  const [firstTag] = validTags

  if (firstTag && validTags.length === 1 && !formData.prefix) {
    filter.Tag = {
      Key: firstTag.key,
      Value: firstTag.value,
    }
  } else if (validTags.length > 0) {
    filter.And = {
      Tags: validTags.map(tag => ({
        Key: tag.key,
        Value: tag.value,
      })),
    }
    if (formData.prefix) {
      filter.And.Prefix = formData.prefix
    }
  } else if (formData.prefix) {
    filter.Prefix = formData.prefix
  }

  if (formData.prefix && firstTag && validTags.length === 1 && !filter.And) {
    filter.Prefix = formData.prefix
    filter.Tag = {
      Key: firstTag.key,
      Value: firstTag.value,
    }
  } else if (formData.prefix && validTags.length === 0) {
    filter.Prefix = formData.prefix
  }

  return Object.keys(filter).length ? filter : undefined
}

const handleSave = async () => {
  if (!validate()) return
  submitting.value = true
  try {
    const currentConfig = await getBucketLifecycleConfiguration(props.bucketName)
    const newRule: any = {
      ID: randomUUID(),
      Status: 'Enabled',
      Filter: buildFilter(),
    }

    const daysValue = Number(formData.days)

    if (formState.action === 'expire') {
      if (formData.versionType === 'non-current') {
        newRule.NoncurrentVersionExpiration = {
          NoncurrentDays: daysValue,
        }
        if (formData.expiredDeleteMark) {
          newRule.ExpiredObjectDeleteMarker = true
        }
      } else {
        newRule.Expiration = {
          Days: daysValue,
        }
        if (formData.expiredDeleteMark) {
          newRule.Expiration.ExpiredObjectDeleteMarker = true
        }
      }
    } else {
      if (formData.versionType === 'non-current') {
        newRule.NoncurrentVersionTransitions = [
          {
            NoncurrentDays: daysValue,
            StorageClass: formData.storageType,
          },
        ]
      } else {
        newRule.Transitions = [
          {
            Days: daysValue,
            StorageClass: formData.storageType,
          },
        ]
      }
    }

    const existingRules = currentConfig.Rules || []
    const payload = {
      Rules: [...existingRules, newRule],
    }

    await putBucketLifecycleConfiguration(props.bucketName, payload)
    message.success(t('Create Success'))
    emit('search')
    handleCancel()
  } catch (error: any) {
    message.error(error?.message || t('Failed to create rule'))
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  visible.value = false
  resetForm()
}

defineExpose({
  open: async () => {
    await Promise.all([loadTiers(), loadVersioningStatus()])
    resetForm()
    visible.value = true
  },
})

onMounted(() => {
  loadTiers()
  loadVersioningStatus()
})
</script>