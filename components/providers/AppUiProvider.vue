<template>
  <slot />
  <AppDialogHost />
  <ClientOnly>
    <Toaster position="top-center" :rich-colors="true" :close-button="true" />
  </ClientOnly>
</template>

<script setup lang="ts">
import AppDialogHost from '@/components/providers/AppDialogHost.vue'
import { Toaster } from '@/components/ui/sonner'
import { createDialogController, dialogControllerKey } from '@/lib/ui/dialog'
import { createMessageApi, messageInjectionKey } from '@/lib/ui/message'
import { provide } from 'vue'
import 'vue-sonner/style.css'

const dialogController = createDialogController()
const messageApi = createMessageApi()

provide(dialogControllerKey, dialogController)
provide(messageInjectionKey, messageApi)
</script>
