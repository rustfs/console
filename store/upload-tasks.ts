import { defineStore } from 'pinia';
import UploadTaskManager from '~/lib/upload-task-manager';

export const useUploadTaskManagerStore = defineStore('uploadTaskManager', {
  state: () => ({
    taskManager: new UploadTaskManager(useNuxtApp().$s3Client, {
      chunkSize: 5,
      maxConcurrentUploads: 6
    })
  }),
  getters: {
    tasks: (state) => state.taskManager.getTasks()
  },
  actions: {
    addFiles(files: File[], bucketName: string, prefix?: string) {
      console.log('addFiles', files, bucketName, prefix);

      this.taskManager.addFiles(files, bucketName, prefix)
      this.taskManager.start()
    },
    getTasks() {
      return this.taskManager.getTasks()
    },

    removeTask(taskId: string) {
      this.taskManager.removeTask(taskId)
    },

    clearTasks() {
      this.taskManager.clearTasks()
    }
  }
})
