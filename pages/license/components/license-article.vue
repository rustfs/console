<template>
  <div class="space-y-6">
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">{{ t('License') }}</h1>
      </template>
    </page-header>

    <page-content>
      <AppCard class="space-y-4">
        <div class="text-center">
          <h2 class="text-2xl font-bold">{{ t('Apache License') }}</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ t('Version 2.0, January 2004') }}
          </p>
        </div>
        <ScrollArea class="h-[70vh] rounded-lg border">
          <pre class="whitespace-pre-wrap p-6 text-sm leading-6 text-muted-foreground">
{{ licenseContent }}
          </pre>
        </ScrollArea>
      </AppCard>
    </page-content>
  </div>
</template>

<script setup lang="ts">
import { AppCard } from '@/components/app'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from 'vue-i18n'
import licenseText from '~/LICENSE?raw'

const { t } = useI18n()
const licenseContent = licenseText
</script>
