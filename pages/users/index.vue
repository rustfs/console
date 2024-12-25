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
          <users-tabs-user></users-tabs-user>
        </n-tab-pane>
        <n-tab-pane name="userGroup" tab="用户组">
          <users-tabs-group></users-tabs-group>
        </n-tab-pane>
      </n-tabs>
    </page-content>
  </div>
</template>

<script setup></script>

<style lang="scss" scoped></style>
