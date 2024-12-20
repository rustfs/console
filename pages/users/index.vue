<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">用户</h1>
      </template>
    </page-header>
    <page-content>
      <n-tabs type="card">
        <n-tab-pane name="users" tab="用户">
          <userTab></userTab>
        </n-tab-pane>
        <n-tab-pane name="userGroup" tab="用户组">
          <groupTab></groupTab>
        </n-tab-pane>
      </n-tabs>
    </page-content>
  </div>
</template>

<script setup>
import { groupTab, userTab } from '~/components/users/tabs';
</script>

<style lang="scss" scoped></style>
