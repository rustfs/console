<template>
  <AppDrawer v-model="visible" :title="drawerTitle" size="xl">
    <div class="space-y-6">
      <AppCard padded class="space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-sm font-medium text-foreground">{{ t('Access Policy') }}</p>
          </div>
          <Button variant="outline" size="sm" class="shrink-0" @click="editPolicy">
            <Icon name="ri:edit-2-line" class="mr-2 size-4" />
            <span>{{ t('Edit') }}</span>
          </Button>
        </div>
        <p class="text-sm text-muted-foreground">{{ currentPolicyLabel }}</p>
      </AppCard>

      <AppCard padded class="space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-sm font-medium text-foreground">{{ t('Encryption') }}</p>
            <p class="text-xs text-muted-foreground">{{ encryptionLabel }}</p>
          </div>
          <Button variant="outline" size="sm" class="shrink-0" @click="editEncrypt">
            <Icon name="ri:edit-2-line" class="mr-2 size-4" />
            <span>{{ t('Edit') }}</span>
          </Button>
        </div>
      </AppCard>

      <AppCard padded class="space-y-3">
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm font-medium text-foreground">{{ t('Tag') }}</p>
          <Button variant="outline" size="sm" class="shrink-0" @click="addTag">
            <Icon name="ri:add-line" class="mr-2 size-4" />
            <span>{{ t('Add') }}</span>
          </Button>
        </div>
        <div v-if="tags.length" class="flex flex-wrap gap-2">
          <div
            v-for="(tag, index) in tags"
            :key="`${tag.Key}-${index}`"
            class="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs"
          >
            <button type="button" class="text-left" @click="editTag(index)">
              {{ tag.Key }}:{{ tag.Value }}
            </button>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 w-6 p-0"
              @click.stop="handleDeleteTag(index)"
            >
              <Icon name="ri:close-line" class="size-3.5" />
            </Button>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground">
          {{ t('No Data') }}
        </p>
      </AppCard>

      <AppCard padded class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium text-foreground">{{ t('Object Lock') }}</p>
            <AppSpinner v-if="objectLockLoading" size="sm" />
          </div>
          <AppSwitch v-model="lockStatus" disabled />
        </div>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium text-foreground">{{ t('Version Control') }}</p>
            <AppSpinner v-if="statusLoading" size="sm" />
          </div>
          <AppSwitch
            :model-value="versioningStatus === 'Enabled'"
            :disabled="lockStatus || statusLoading"
            @update:model-value="value => handleVersionToggle(value)"
          />
        </div>
      </AppCard>

      <AppCard padded class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-foreground">{{ t('Retention') }}</p>
            <p class="text-xs text-muted-foreground">
              {{ retentionEnabled ? t('Enabled') : t('Disabled') }}
            </p>
          </div>
          <Button variant="outline" size="sm" class="shrink-0" @click="editRetention">
            <span>{{ t('Edit') }}</span>
          </Button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <p class="text-xs text-muted-foreground">{{ t('Retention Mode') }}</p>
            <p class="text-sm text-foreground">
              {{ retentionFormValue.retentionMode ? t(retentionFormValue.retentionMode) : '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">{{ t('Retention Unit') }}</p>
            <p class="text-sm text-foreground">
              {{ retentionFormValue.retentionUnit ? t(retentionFormValue.retentionUnit) : '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">{{ t('Retention Period') }}</p>
            <p class="text-sm text-foreground">
              {{ retentionFormValue.retentionPeriod ?? '-' }}
            </p>
          </div>
        </div>
      </AppCard>
    </div>
  </AppDrawer>

  <AppModal v-model="showPolicyModal" :title="t('Set Policy')" size="xl">
    <AppCard padded class="space-y-4">
      <div class="space-y-2">
        <Label>{{ t('Policy') }}</Label>
        <AppSelect
          v-model="policyFormValue.policy"
          :options="policyOptions"
          :placeholder="t('Please select policy')"
        />
      </div>
      <div v-if="policyFormValue.policy === 'custom'" class="space-y-2">
        <Label>{{ t('Policy Content') }}</Label>
        <div class="max-h-[60vh] overflow-y-auto rounded-md border p-2">
          <json-editor v-model="policyFormValue.content" />
        </div>
      </div>
    </AppCard>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="showPolicyModal = false">
          {{ t('Cancel') }}
        </Button>
        <Button variant="default" @click="submitPolicyForm">
          {{ t('Confirm') }}
        </Button>
      </div>
    </template>
  </AppModal>

  <AppModal v-model="showTagModal" :title="t('Set Tag')" size="md">
    <AppCard padded class="space-y-4">
      <div class="space-y-2">
        <Label>{{ t('Tag Key') }}</Label>
        <Input v-model="tagFormValue.name" :placeholder="t('Tag Key Placeholder')" />
      </div>
      <div class="space-y-2">
        <Label>{{ t('Tag Value') }}</Label>
        <Input v-model="tagFormValue.value" :placeholder="t('Please enter tag value')" />
      </div>
    </AppCard>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="showTagModal = false">
          {{ t('Cancel') }}
        </Button>
        <Button variant="default" @click="submitTagForm">
          {{ t('Confirm') }}
        </Button>
      </div>
    </template>
  </AppModal>

  <AppModal v-model="showEncryptModal" :title="t('Enable Storage Encryption')" size="md">
    <AppCard padded class="space-y-4">
      <div class="space-y-2">
        <Label>{{ t('Encryption Type') }}</Label>
        <AppSelect
          v-model="encryptFormValue.encrypt"
          :options="encryptionOptions"
          :placeholder="t('Please select encryption type')"
        />
      </div>
      <div v-if="encryptFormValue.encrypt === 'SSE-KMS'" class="space-y-2">
        <Label>KMS Key ID</Label>
        <AppSelect
          v-model="encryptFormValue.kmsKeyId"
          :options="kmsKeyOptions"
          :placeholder="t('Please select KMS key')"
        />
      </div>
    </AppCard>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="showEncryptModal = false">
          {{ t('Cancel') }}
        </Button>
        <Button variant="default" @click="submitEncryptForm">
          {{ t('Confirm') }}
        </Button>
      </div>
    </template>
  </AppModal>

  <AppModal v-model="showRetentionModal" :title="t('Set Retention')" size="md">
    <AppCard padded class="space-y-4">
      <div class="space-y-2">
        <Label>{{ t('Retention Mode') }}</Label>
        <AppRadioGroup
          v-model="retentionFormValue.retentionMode"
          :options="retentionModeOptions"
          class="grid gap-2 sm:grid-cols-2"
        />
      </div>
      <div class="space-y-2">
        <Label>{{ t('Retention Unit') }}</Label>
        <AppRadioGroup
          v-model="retentionFormValue.retentionUnit"
          :options="retentionUnitOptions"
          class="grid gap-2 sm:grid-cols-2"
        />
      </div>
      <div class="space-y-2">
        <Label>{{ t('Retention Period') }}</Label>
        <Input v-model="retentionPeriodInput" type="number" />
      </div>
    </AppCard>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="showRetentionModal = false">
          {{ t('Cancel') }}
        </Button>
        <Button variant="default" @click="submitRetentionForm">
          {{ t('Confirm') }}
        </Button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { AppCard, AppDrawer, AppModal, AppRadioGroup, AppSelect, AppSwitch, AppSpinner } from '@/components/app'
import { Label } from '@/components/ui/label'
import { Icon } from '#components'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BucketPolicyType } from '~/utils/bucket-policy'
import { getBucketPolicy as detectBucketPolicy, setBucketPolicy } from '~/utils/bucket-policy'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const visible = ref(false)
const bucketName = ref('')

const drawerTitle = computed(() => `${t('Bucket Configuration')}(${bucketName.value || '-'})`)

const openDrawer = (bucket: string) => {
  visible.value = true
  bucketName.value = bucket
  getData()
}

defineExpose({ openDrawer })

const {
  getBucketTagging,
  putBucketTagging,
  putBucketVersioning,
  getBucketVersioning,
  getBucketPolicy,
  putBucketPolicy,
  getObjectLockConfiguration,
  putObjectLockConfiguration,
  getBucketEncryption,
  putBucketEncryption,
  deleteBucketEncryption,
} = useBucket({})

const { getKeyList } = useSSE()

const lockStatus = ref(false)
const objectLockLoading = ref(false)
const retentionEnabled = ref(false)

const retentionFormValue = ref<{
  retentionMode: string | null
  retentionPeriod: number | null
  retentionUnit: string | null
}>({
  retentionMode: null,
  retentionPeriod: null,
  retentionUnit: null,
})

const policyFormValue = ref({
  policy: 'private',
  content: '{}',
})
const bucketPolicy = ref('public')
const showPolicyModal = ref(false)

const encryptFormValue = ref({
  encrypt: 'disabled',
  kmsKeyId: '',
})
const showEncryptModal = ref(false)
const kmsKeyOptions = ref<{ label: string; value: string }[]>([])

const versioningStatus = ref<'Enabled' | 'Suspended' | undefined>('Suspended')
const statusLoading = ref(false)

interface Tag {
  Key: string
  Value: string
}

const tags = ref<Tag[]>([])
const showTagModal = ref(false)
const tagFormValue = ref({
  name: '',
  value: '',
})
const editingTagIndex = ref(-1)

const showRetentionModal = ref(false)

const retentionPeriodInput = computed({
  get: () => (retentionFormValue.value.retentionPeriod ?? '').toString(),
  set: value => {
    if (!value) {
      retentionFormValue.value.retentionPeriod = null
      return
    }
    const numeric = Number.parseInt(value, 10)
    retentionFormValue.value.retentionPeriod = Number.isFinite(numeric) ? numeric : null
  },
})

const policyOptions = computed(() => [
  { label: t('Public'), value: 'public' },
  { label: t('Private'), value: 'private' },
  { label: t('Custom'), value: 'custom' },
])

const encryptionOptions = computed(() => [
  { label: t('Disabled'), value: 'disabled' },
  { label: 'SSE-KMS', value: 'SSE-KMS' },
  { label: 'SSE-S3', value: 'SSE-S3' },
])

const retentionModeOptions = computed(() => [
  { label: t('COMPLIANCE'), value: 'COMPLIANCE' },
  { label: t('GOVERNANCE'), value: 'GOVERNANCE' },
])

const retentionUnitOptions = computed(() => [
  { label: t('DAYS'), value: 'Days' },
  { label: t('YEARS'), value: 'Years' },
])

const currentPolicyLabel = computed(() => {
  const option = policyOptions.value.find(option => option.value === bucketPolicy.value)
  if (option) return option.label
  if (bucketPolicy.value === 'custom') return t('Custom')
  return bucketPolicy.value
})

const encryptionLabel = computed(() => {
  if (encryptFormValue.value.encrypt === 'SSE-KMS') return 'SSE-KMS'
  if (encryptFormValue.value.encrypt === 'SSE-S3') return 'SSE-S3'
  return t('Disabled')
})

const getData = async () => {
  await Promise.allSettled([
    getTags(),
    getVersioningStatus(),
    getObjectLockConfig(),
    getBucketEncryptionInfo(),
    loadBucketPolicy(),
  ])
}

const getObjectLockConfig = async () => {
  objectLockLoading.value = true
  try {
    const res = await getObjectLockConfiguration(bucketName.value)
    if (res.ObjectLockConfiguration?.ObjectLockEnabled === 'Enabled') {
      lockStatus.value = true
      const rule = res.ObjectLockConfiguration.Rule?.DefaultRetention
      if (rule) {
        retentionEnabled.value = true
        retentionFormValue.value.retentionMode = rule.Mode ?? null
        retentionFormValue.value.retentionPeriod = rule.Days ?? rule.Years ?? null
        retentionFormValue.value.retentionUnit = rule.Years ? 'Years' : rule.Days ? 'Days' : null
      } else {
        retentionEnabled.value = false
        retentionFormValue.value.retentionMode = null
        retentionFormValue.value.retentionPeriod = null
        retentionFormValue.value.retentionUnit = null
      }
    } else {
      lockStatus.value = false
      retentionEnabled.value = false
      retentionFormValue.value.retentionMode = null
      retentionFormValue.value.retentionPeriod = null
      retentionFormValue.value.retentionUnit = null
    }
  } finally {
    objectLockLoading.value = false
  }
}

const loadBucketPolicy = async () => {
  try {
    const res = await getBucketPolicy(bucketName.value)
    if (res.Policy) {
      policyFormValue.value.content = res.Policy
      const parsed = detectBucketPolicy(JSON.parse(res.Policy).Statement, bucketName.value, '')
      bucketPolicy.value = parsed === 'none' ? 'custom' : parsed
      policyFormValue.value.policy = bucketPolicy.value
    } else {
      bucketPolicy.value = 'public'
      policyFormValue.value.policy = 'public'
    }
  } catch (error: any) {
    console.error('Error fetching bucket policy:', error)
    bucketPolicy.value = 'private'
    policyFormValue.value.policy = 'private'
    policyFormValue.value.content = '{}'
  }
}

const editPolicy = () => {
  showPolicyModal.value = true
}

const submitPolicyForm = async () => {
  try {
    if (policyFormValue.value.policy === 'custom') {
      const parsed = JSON.stringify(JSON.parse(policyFormValue.value.content))
      await putBucketPolicy(bucketName.value, parsed)
    } else {
      const statements = setBucketPolicy([], policyFormValue.value.policy as BucketPolicyType, bucketName.value, '')
      await putBucketPolicy(bucketName.value, JSON.stringify({ Version: '2012-10-17', Statement: statements }))
    }
    message.success(t('Edit Success'))
    showPolicyModal.value = false
    await loadBucketPolicy()
  } catch (error: any) {
    message.error(`${t('Edit Failed')}: ${error.message}`)
  }
}

const editEncrypt = () => {
  showEncryptModal.value = true
  if (encryptFormValue.value.encrypt === 'SSE-KMS') {
    fetchKMSKeys()
  }
}

const getBucketEncryptionInfo = async () => {
  try {
    const res = await getBucketEncryption(bucketName.value)
    const rule = res.ServerSideEncryptionConfiguration?.Rules?.[0]
    const defaultRule = rule?.ApplyServerSideEncryptionByDefault
    if (defaultRule?.SSEAlgorithm === 'aws:kms') {
      encryptFormValue.value.encrypt = 'SSE-KMS'
      encryptFormValue.value.kmsKeyId = defaultRule.KMSMasterKeyID ?? ''
    } else if (defaultRule?.SSEAlgorithm === 'AES256') {
      encryptFormValue.value.encrypt = 'SSE-S3'
      encryptFormValue.value.kmsKeyId = ''
    } else {
      encryptFormValue.value.encrypt = 'disabled'
      encryptFormValue.value.kmsKeyId = ''
    }
  } catch (error: any) {
    if (error?.status === 404) {
      encryptFormValue.value.encrypt = 'disabled'
      encryptFormValue.value.kmsKeyId = ''
    } else {
      console.error('Failed to get bucket encryption:', error)
    }
  }
}

const fetchKMSKeys = async () => {
  try {
    const response = await getKeyList()
    kmsKeyOptions.value = (response?.keys || []).map((key: any) => {
      const label = key.tags?.name || key.description || `Key-${key.key_id?.substring(0, 8)}`
      return { label, value: key.key_id }
    })
  } catch (error) {
    console.error('Failed to fetch KMS keys:', error)
    message.error(t('Failed to fetch KMS keys'))
  }
}

watch(
  () => encryptFormValue.value.encrypt,
  value => {
    if (value === 'SSE-KMS') {
      fetchKMSKeys()
    }
  }
)

const submitEncryptForm = async () => {
  try {
    if (encryptFormValue.value.encrypt === 'disabled') {
      await deleteBucketEncryption(bucketName.value)
    } else if (encryptFormValue.value.encrypt === 'SSE-KMS') {
      if (!encryptFormValue.value.kmsKeyId) {
        message.error(t('Please select a KMS key for SSE-KMS encryption'))
        return
      }
      await putBucketEncryption(bucketName.value, {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
              KMSMasterKeyID: encryptFormValue.value.kmsKeyId,
            },
          },
        ],
      })
    } else {
      await putBucketEncryption(bucketName.value, {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      })
    }
    message.success(t('Edit Success'))
    showEncryptModal.value = false
    await getBucketEncryptionInfo()
  } catch (error: any) {
    message.error(`${t('Edit Failed')}: ${error.message}`)
  }
}

const getVersioningStatus = async () => {
  try {
    const resp = await getBucketVersioning(bucketName.value)
    versioningStatus.value = resp.Status as 'Enabled' | 'Suspended' | undefined
  } catch (error) {
    console.error('get version fail:', error)
  }
}

const handleVersionToggle = async (value: boolean) => {
  if (statusLoading.value) return
  const target = value ? 'Enabled' : 'Suspended'
  const previous = versioningStatus.value
  statusLoading.value = true
  try {
    await putBucketVersioning(bucketName.value, target)
    versioningStatus.value = target
    message.success(t('Edit Success'))
  } catch (error: any) {
    versioningStatus.value = previous
    message.error(`${t('Edit Failed')}: ${error.message}`)
  } finally {
    statusLoading.value = false
  }
}

const getTags = async () => {
  const resp: any = await getBucketTagging(bucketName.value)
  tags.value = resp.TagSet || []
}

const addTag = () => {
  editingTagIndex.value = -1
  tagFormValue.value = { name: '', value: '' }
  showTagModal.value = true
}

const editTag = (index: number) => {
  editingTagIndex.value = index
  const nowTag = tags.value[index]
  if (!nowTag) return
  tagFormValue.value = { name: nowTag.Key, value: nowTag.Value }
  showTagModal.value = true
}

const handleDeleteTag = (index: number) => {
  dialog.error({
    title: t('Warning'),
    content: t('Delete Tag Confirm'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      tags.value.splice(index, 1)
      try {
        await putBucketTagging(bucketName.value, { TagSet: tags.value })
        message.success(t('Tag Update Success'))
      } catch (error: any) {
        message.error(`${t('Tag Delete Failed')}: ${error.message}`)
      }
    },
  })
}

const submitTagForm = async () => {
  if (!tagFormValue.value.name || !tagFormValue.value.value) {
    message.error(t('Please fill in complete tag information'))
    return
  }

  if (editingTagIndex.value === -1) {
    tags.value.push({ Key: tagFormValue.value.name, Value: tagFormValue.value.value })
  } else {
    tags.value[editingTagIndex.value] = {
      Key: tagFormValue.value.name,
      Value: tagFormValue.value.value,
    }
  }

  try {
    await putBucketTagging(bucketName.value, { TagSet: tags.value })
    message.success(t('Tag Update Success'))
    showTagModal.value = false
  } catch (error: any) {
    message.error(`${t('Tag Update Failed')}: ${error.message}`)
  }
}

const editRetention = () => {
  if (!lockStatus.value) {
    message.error(t('Object lock is not enabled, cannot set retention'))
    return
  }
  showRetentionModal.value = true
}

const submitRetentionForm = async () => {
  const { retentionMode, retentionPeriod, retentionUnit } = retentionFormValue.value
  if (!retentionMode || !retentionPeriod || !retentionUnit) {
    message.error(t('Please fill in complete retention information'))
    return
  }

  try {
    await putObjectLockConfiguration(bucketName.value, {
      ObjectLockEnabled: 'Enabled',
      Rule: {
        DefaultRetention: {
          Mode: retentionMode,
          Days: retentionUnit === 'Days' ? retentionPeriod : null,
          Years: retentionUnit === 'Years' ? retentionPeriod : null,
        },
      },
    })
    message.success(t('Edit Success'))
    showRetentionModal.value = false
    await getObjectLockConfig()
  } catch (error: any) {
    message.error(`${t('Edit Failed')}: ${error.message}`)
  }
}
</script>
