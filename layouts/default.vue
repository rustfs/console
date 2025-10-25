<template>
  <div v-if="isAuthRoute" class="min-h-screen">
    <slot />
  </div>
  <SidebarProvider v-else>
    <div class="flex min-h-screen w-full">
      <AppSidebar />
      <SidebarInset>
        <div class="flex min-h-screen flex-1 flex-col">
          <header class="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4 shadow-sm md:hidden">
            <SidebarTrigger />
            <span class="text-sm font-semibold">{{ appConfig.name }}</span>
          </header>
          <div class="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
            <slot />
          </div>
        </div>
      </SidebarInset>
    </div>
  </SidebarProvider>
</template>

<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { computed } from 'vue';
import type { AppConfig } from '~/types/app-config';

const route = useRoute();
const appConfig = useAppConfig() as unknown as AppConfig;

const isAuthRoute = computed(() => route.path.startsWith('/auth'));
</script>
