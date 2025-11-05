<template>
  <div class="sticky bg-background top-0 z-10 flex flex-col justify-between gap-2 md:flex-row">
    <div class="space-y-2">
      <slot />
      <slot name="description"></slot>
    </div>
    <div class="flex flex-1 flex-wrap items-center justify-end gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
