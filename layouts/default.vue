<script setup lang="ts">
import AppSidebar from '@/components/app/AppSidebar.vue'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showSidebar = computed(() => !route.path.startsWith('/auth'))
</script>

<template>
  <SidebarProvider v-if="showSidebar">
    <AppSidebar />
    <SidebarInset class="bg-background">
      <header
        class="flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 transition-[height] ease-linear backdrop-blur group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
      >
        <SidebarTrigger class="-ml-1" />
        <Separator orientation="vertical" class="h-4" />
      </header>
      <div class="flex flex-1 flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto">
          <slot />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
  <div v-else class="min-h-screen bg-background">
    <slot />
  </div>
</template>
