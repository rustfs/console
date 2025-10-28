<script setup lang="ts">
import AppSidebar from '@/components/app-sidebar.vue'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showSidebar = computed(() => !route.path.startsWith('/auth'))
</script>

<template>
  <SidebarProvider v-if="showSidebar">
    <AppSidebar />
    <SidebarInset>
      <AppTopNav />
      <div class="flex flex-1 flex-col gap-4 pt-0">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
  <div v-else class="min-h-screen bg-background">
    <slot />
  </div>
</template>
