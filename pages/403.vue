<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import Button from '@/components/ui/button/Button.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
function handleBack() {
  router.replace('/')
}
</script>

<template>
  <div class="flex flex-1 items-center justify-center min-h-[60vh]">
    <Empty class="py-8">
      <EmptyContent class="max-w-sm text-center">
        <EmptyHeader>
          <EmptyMedia variant="icon" class="mx-auto">
            <svg viewBox="0 0 48 48" fill="none" class="h-12 w-12">
              <circle cx="24" cy="24" r="22" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="2" />
              <path
                d="M16 21V19a8 8 0 0116 0v2"
                stroke="#A3A3A3"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <rect x="16" y="28" width="16" height="4" rx="2" fill="#A3A3A3" />
              <rect x="22" y="32" width="4" height="4" rx="2" fill="#A3A3A3" />
            </svg>
          </EmptyMedia>
          <EmptyTitle>{{ t('Access Denied') }}</EmptyTitle>
          <EmptyDescription>{{
            t(
              'You do not have permission to access this page. This may be due to insufficient permissions or not being logged in.'
            )
          }}</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" class="mt-6" @click="handleBack">{{ t('Back to Home') }}</Button>
      </EmptyContent>
    </Empty>
  </div>
</template>
