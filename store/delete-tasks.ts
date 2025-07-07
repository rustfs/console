import { defineStore } from "pinia";
import DeleteTaskManager from "~/lib/delete-task-manager";

export const useDeleteTaskManagerStore = defineStore("DeleteTaskManager", {
  state: () => ({
    taskManager: new DeleteTaskManager(useNuxtApp().$s3Client, {
      chunkSize: 16, // Not used for delete, kept for consistency
      maxConcurrentUploads: 6, // Limit concurrent deletes
      maxRetries: 3, // Retry failed deletes
      retryDelay: 1000, // Wait 1 second before retrying
    }),
  }),
  getters: {
    tasks: (state) => state.taskManager.getTasks(),
    pendingTasks: (state) => state.taskManager.getTasks().filter(task => task.status === "pending"),
    deletingTasks: (state) => state.taskManager.getTasks().filter(task => task.status === "deleting"),
    completedTasks: (state) => state.taskManager.getTasks().filter(task => task.status === "completed"),
    failedTasks: (state) => state.taskManager.getTasks().filter(task => task.status === "failed"),
  },
  actions: {
    addKeys(keys: string[], bucketName: string, prefix?: string) {
      console.log("addKeys", keys.length, "keys to bucket", bucketName, "prefix:", prefix);

      // 对于大量文件，分批处理
      const batchSize = 50;
      if (keys.length > batchSize) {
        console.log(`Processing ${keys.length} keys in batches of ${batchSize}`);
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          this.taskManager.addKeys(batch, bucketName, prefix);
        }
      } else {
        this.taskManager.addKeys(keys, bucketName, prefix);
      }
    },

    getTasks() {
      return this.taskManager.getTasks();
    },

    cancelTask(taskId: string) {
      this.taskManager.cancelTask(taskId);
    },

    cancelAllTasks() {
      this.taskManager.cancel();
    },

    removeTask(taskId: string) {
      this.taskManager.removeTask(taskId);
    },

    clearTasks() {
      this.taskManager.clearTasks();
    },

    // 获取统计信息
    getStats() {
      const tasks = this.tasks;
      return {
        total: tasks.length,
        pending: tasks.filter(task => task.status === "pending").length,
        deleting: tasks.filter(task => task.status === "deleting").length,
        completed: tasks.filter(task => task.status === "completed").length,
        failed: tasks.filter(task => task.status === "failed").length,
        canceled: tasks.filter(task => task.status === "canceled").length,
      };
    },
  },
});
