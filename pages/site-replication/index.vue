<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('Site Replication') }}</h1>
      </template>
    </page-header>
    <page-content class="flex flex-col gap-4">
      <div class="flex justify-end">
        <Button type="button" variant="secondary" class="inline-flex items-center gap-2" @click="openForm">
          <Icon name="ri:add-line" class="size-4" />
          <span>{{ t('Add Site') }}</span>
        </Button>
      </div>

      <Card class="min-h-[400px]">
        <CardContent class="flex h-full items-center justify-center">
          <p class="text-sm text-muted-foreground">{{ t('No Data') }}</p>
        </CardContent>
      </Card>

      <site-replication-new-form ref="addFormRef"></site-replication-new-form>
    </page-content>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#components'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const addFormRef = ref<{ open: () => void } | null>(null)

const openForm = () => {
  addFormRef.value?.open()
}
</script>
