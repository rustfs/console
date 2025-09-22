import { defineStore } from 'pinia';
import UploadTaskManager from '~/lib/upload-task-manager';

export const useUploadTaskManagerStore = defineStore('uploadTaskManager', {
  state: () => ({
    taskManager: new UploadTaskManager(useNuxtApp().$s3Client, {
      chunkSize: 16, // 16MB chunks for better performance
      maxConcurrentUploads: 6, // Limit concurrent uploads
      maxRetries: 3, // Retry failed uploads
      retryDelay: 1000, // Wait 1 second before retrying
    }),
  }),
  getters: {
    tasks: state => state.taskManager.getTasks(),
    pendingTasks: state => state.taskManager.getTasks().filter(task => task.status === 'pending'),
    uploadingTasks: state => state.taskManager.getTasks().filter(task => task.status === 'uploading'),
    completedTasks: state => state.taskManager.getTasks().filter(task => task.status === 'completed'),
    failedTasks: state => state.taskManager.getTasks().filter(task => task.status === 'failed'),
    canceledTasks: state => state.taskManager.getTasks().filter(task => task.status === 'canceled'),
    pausedTasks: state => state.taskManager.getTasks().filter(task => task.status === 'paused'),
  },
  actions: {
    addFiles(files: File[], bucketName: string, prefix?: string) {
      console.log('addFiles', files.length, 'files to bucket', bucketName, 'prefix:', prefix);

      // 对于大量文件，分批处理
      const batchSize = 50;
      if (files.length > batchSize) {
        console.log(`Processing ${files.length} files in batches of ${batchSize}`);
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          this.taskManager.addFiles(batch, bucketName, prefix);
        }
      } else {
        this.taskManager.addFiles(files, bucketName, prefix);
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

    pauseTask(taskId: string) {
      this.taskManager.pauseTask(taskId);
    },
    resumeTask(taskId: string) {
      this.taskManager.resumeTask(taskId);
    },

    // 获取统计信息
    getStats() {
      const tasks = this.tasks;
      return {
        total: tasks.length,
        pending: tasks.filter(task => task.status === 'pending').length,
        uploading: tasks.filter(task => task.status === 'uploading').length,
        completed: tasks.filter(task => task.status === 'completed').length,
        failed: tasks.filter(task => task.status === 'failed').length,
        canceled: tasks.filter(task => task.status === 'canceled').length,
        paused: tasks.filter(task => task.status === 'paused').length,
      };
    },
  },
});
