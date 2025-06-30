import { defineStore } from "pinia";
import DeleteTaskManager from "~/lib/delete-task-manager";

export const useDeleteTaskManagerStore = defineStore("DeleteTaskManager", {
  state: () => ({
    taskManager: new DeleteTaskManager(useNuxtApp().$s3Client, {
      chunkSize: 16,
      maxConcurrentUploads: 6,
    }),
  }),
  getters: {
    tasks: (state) => state.taskManager.getTasks(),
  },
  actions: {
    addKeys(keys: string[], bucketName: string, prefix?: string) {
      console.log("addKeys", keys, bucketName, prefix);
      this.taskManager.addKeys(keys, bucketName, prefix);
      this.taskManager.start();
    },
    getTasks() {
      return this.taskManager.getTasks();
    },

    removeTask(taskId: string) {
      this.taskManager.removeTask(taskId);
    },

    clearTasks() {
      this.taskManager.clearTasks();
    },
  },
});
