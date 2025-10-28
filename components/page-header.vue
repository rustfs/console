<template>
  <div class="sticky top-0 z-10 flex flex-col md:flex-row justify-between gap-2">
    <slot name="title"></slot>
    <div class="flex-1 flex flex-wrap items-center justify-end gap-2">
      <slot name="actions"></slot>
    </div>
  </div>
</template>
