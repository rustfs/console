<script setup lang="ts">
import AppSidebar from '@/components/app/AppSidebar.vue'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showSidebar = computed(() => !route.path.startsWith('/auth'))
</script>

<template>
  <SidebarProvider v-if="showSidebar">
    <AppSidebar />
    <SidebarInset>
      <header
        class="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[height] ease-linear backdrop-blur group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
          <Separator orientation="vertical" class="h-4" />
        </div>
      </header>
      <div class="flex flex-1 flex-col gap-4 pt-0">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
  <div v-else class="min-h-screen bg-background">
    <slot />
  </div>
</template>
