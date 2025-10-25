<template>
  <Dialog :open="visible" @update:open="handleOpenChange">
    <DialogContent
      class="max-w-4xl"
      @pointerDownOutside.prevent
      @interactOutside.prevent
      @escapeKeyDown.prevent
    >
      <DialogHeader class="space-y-2 text-left">
        <DialogTitle>{{ t('Add Site Replication') }}</DialogTitle>
        <DialogDescription>
          {{ t('Note: AccessKey and SecretKey values are required for each site when adding or editing peer sites') }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-8">
        <section class="space-y-4">
          <h3 class="text-lg font-semibold">{{ t('Current Site') }}</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="current-site-name">{{ t('Site Name') }}</Label>
              <Input
                id="current-site-name"
                v-model="currentSite.name"
                :placeholder="t('Site Name')"
              />
            </div>
            <div class="space-y-2 sm:col-span-2">
              <Label for="current-site-endpoint">{{ t('Endpoint *') }}</Label>
              <Input
                id="current-site-endpoint"
                v-model="currentSite.endpoint"
                :placeholder="t('Endpoint')"
              />
              <p v-if="currentErrors.endpoint" class="text-sm text-destructive">
                {{ currentErrors.endpoint }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="current-site-access">{{ t('Access Key *') }}</Label>
              <Input
                id="current-site-access"
                v-model="currentSite.accessKey"
                :placeholder="t('Access Key')"
              />
              <p v-if="currentErrors.accessKey" class="text-sm text-destructive">
                {{ currentErrors.accessKey }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="current-site-secret">{{ t('Secret Key *') }}</Label>
              <Input
                id="current-site-secret"
                v-model="currentSite.secretKey"
                type="password"
                :placeholder="t('Secret Key')"
              />
              <p v-if="currentErrors.secretKey" class="text-sm text-destructive">
                {{ currentErrors.secretKey }}
              </p>
            </div>
          </div>
        </section>

        <section class="space-y-4">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-lg font-semibold">{{ t('Remote Site') }}</h3>
            <Button
              type="button"
              variant="secondary"
              class="inline-flex items-center gap-2 self-start"
              @click="addRemoteSite"
            >
              <Icon class="size-4" name="ri:add-line" />
              {{ t('Add Site') }}
            </Button>
          </div>

          <div class="space-y-4">
            <div
              v-for="(site, index) in remoteSite"
              :key="index"
              class="space-y-4 rounded-lg border p-4"
            >
              <div class="flex items-start justify-between">
                <p class="text-sm font-medium text-muted-foreground">
                  {{ t('Remote Site') }} {{ index + 1 }}
                </p>
                <Button
                  v-if="remoteSite.length > 1"
                  type="button"
                  size="icon"
                  variant="ghost"
                  class="-mr-2 h-8 w-8"
                  :aria-label="t('Delete')"
                  @click="removeRemoteSite(index)"
                >
                  <Icon class="size-4" name="ri:close-line" />
                </Button>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label :for="`remote-site-name-${index}`">{{ t('Site Name') }}</Label>
                  <Input
                    :id="`remote-site-name-${index}`"
                    v-model="site.name"
                    :placeholder="t('Site Name')"
                  />
                </div>
                <div class="space-y-2 sm:col-span-2">
                  <Label :for="`remote-site-endpoint-${index}`">{{ t('Endpoint *') }}</Label>
                  <Input
                    :id="`remote-site-endpoint-${index}`"
                    v-model="site.endpoint"
                    :placeholder="t('Endpoint')"
                  />
                  <p v-if="remoteErrors[index]?.endpoint" class="text-sm text-destructive">
                    {{ remoteErrors[index].endpoint }}
                  </p>
                </div>
                <div class="space-y-2">
                  <Label :for="`remote-site-access-${index}`">{{ t('Access Key *') }}</Label>
                  <Input
                    :id="`remote-site-access-${index}`"
                    v-model="site.accessKey"
                    :placeholder="t('Access Key')"
                  />
                  <p v-if="remoteErrors[index]?.accessKey" class="text-sm text-destructive">
                    {{ remoteErrors[index].accessKey }}
                  </p>
                </div>
                <div class="space-y-2">
                  <Label :for="`remote-site-secret-${index}`">{{ t('Secret Key *') }}</Label>
                  <Input
                    :id="`remote-site-secret-${index}`"
                    v-model="site.secretKey"
                    type="password"
                    :placeholder="t('Secret Key')"
                  />
                  <p v-if="remoteErrors[index]?.secretKey" class="text-sm text-destructive">
                    {{ remoteErrors[index].secretKey }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
        <Button type="button" variant="outline" @click="cancel">{{ t('Cancel') }}</Button>
        <Button type="button" @click="save">{{ t('Save') }}</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface SiteFormValue {
  name: string
  endpoint: string
  accessKey: string
  secretKey: string
}

interface SiteFormErrors {
  endpoint: string
  accessKey: string
  secretKey: string
}

const { t } = useI18n()

const visible = ref(false)

const currentSite = reactive<SiteFormValue>({
  name: '',
  endpoint: 'http://127.0.0.1:7000',
  accessKey: 'rusyfsadmin',
  secretKey: '',
})

const remoteSite = ref<SiteFormValue[]>([
  {
    name: '',
    endpoint: '',
    accessKey: '',
    secretKey: '',
  },
])

const currentErrors = reactive<SiteFormErrors>({
  endpoint: '',
  accessKey: '',
  secretKey: '',
})

const remoteErrors = ref<SiteFormErrors[]>([
  {
    endpoint: '',
    accessKey: '',
    secretKey: '',
  },
])

const createRemoteEntry = (): SiteFormValue => ({
  name: '',
  endpoint: '',
  accessKey: '',
  secretKey: '',
})

const createErrorState = (): SiteFormErrors => ({
  endpoint: '',
  accessKey: '',
  secretKey: '',
})

const handleOpenChange = (value: boolean) => {
  visible.value = value
}

const addRemoteSite = () => {
  remoteSite.value.push(createRemoteEntry())
  remoteErrors.value.push(createErrorState())
}

const removeRemoteSite = (index: number) => {
  if (remoteSite.value.length <= 1) return
  remoteSite.value.splice(index, 1)
  remoteErrors.value.splice(index, 1)
}

watch(
  () => remoteSite.value.length,
  newLength => {
    while (remoteErrors.value.length < newLength) {
      remoteErrors.value.push(createErrorState())
    }
    while (remoteErrors.value.length > newLength) {
      remoteErrors.value.pop()
    }
  }
)

watch(
  () => currentSite.endpoint,
  value => {
    if (value?.trim()) {
      currentErrors.endpoint = ''
    }
  }
)

watch(
  () => currentSite.accessKey,
  value => {
    if (value?.trim()) {
      currentErrors.accessKey = ''
    }
  }
)

watch(
  () => currentSite.secretKey,
  value => {
    if (value?.trim()) {
      currentErrors.secretKey = ''
    }
  }
)

watch(
  remoteSite,
  sites => {
    sites.forEach((site, index) => {
      const errors = remoteErrors.value[index] ?? createErrorState()
      if (site.endpoint?.trim()) {
        errors.endpoint = ''
      }
      if (site.accessKey?.trim()) {
        errors.accessKey = ''
      }
      if (site.secretKey?.trim()) {
        errors.secretKey = ''
      }
      remoteErrors.value[index] = errors
    })
  },
  { deep: true }
)

const validate = () => {
  let valid = true

  if (!currentSite.endpoint.trim()) {
    currentErrors.endpoint = t('Endpoint is required')
    valid = false
  }
  if (!currentSite.accessKey.trim()) {
    currentErrors.accessKey = t('Access Key is required')
    valid = false
  }
  if (!currentSite.secretKey.trim()) {
    currentErrors.secretKey = t('Secret Key is required')
    valid = false
  }

  remoteSite.value.forEach((site, index) => {
    const errors = remoteErrors.value[index] ?? createErrorState()

    if (!site.endpoint.trim()) {
      errors.endpoint = t('Endpoint is required')
      valid = false
    }
    if (!site.accessKey.trim()) {
      errors.accessKey = t('Access Key is required')
      valid = false
    }
    if (!site.secretKey.trim()) {
      errors.secretKey = t('Secret Key is required')
      valid = false
    }

    remoteErrors.value[index] = errors
  })

  return valid
}

const save = () => {
  if (!validate()) {
    return
  }
  console.log('Current Site:', { ...currentSite })
  console.log('Remote Site:', remoteSite.value.map(site => ({ ...site })))
  visible.value = false
}

const cancel = () => {
  visible.value = false
}

const open = () => {
  visible.value = true
}

defineExpose({
  open,
})
</script>
