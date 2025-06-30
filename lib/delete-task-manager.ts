import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface DeleteTask {
  id: string;
  key: string;
  bucketName: string;
  prefix?: string;
  status: "pending" | "deleting" | "completed" | "failed" | "canceled";
  progress: number;
  error?: string;
  abortController?: AbortController;
}

export interface TaskManagerConfig {
  chunkSize?: number; // in MB
  maxConcurrentUploads?: number;
}

class DeleteTaskManager {
  private tasks = reactive<DeleteTask[]>([]);
  private maxConcurrentUploads: number;
  private chunkSize: number;
  private s3Client: S3Client;
  private activeUploads: number = 0;

  constructor(s3Client: S3Client, config: TaskManagerConfig) {
    this.s3Client = s3Client;
    this.chunkSize = (config.chunkSize ?? 5) * 1024 * 1024; // Default 5MB
    this.maxConcurrentUploads = config.maxConcurrentUploads ?? 6;
  }

  addKeys(keys: string[], bucketName: string, prefix?: string) {
    keys.forEach((key) => {
      const task: DeleteTask = {
        id: `${Date.now()}-${key}`,
        key,
        status: "pending",
        progress: 0,
        bucketName,
        prefix: prefix ?? "",
        error: undefined,
        abortController: undefined,
      };
      this.tasks.push(task);
    });

    console.debug("Added keys to delete queue", keys);
  }

  start() {
    this.processQueue();
  }

  cancel() {
    this.tasks
      .filter((task) => task.status === "pending")
      .forEach((task) => {
        task.status = "canceled";
      });
  }

  cancelTask(taskId: string) {
    const task = this.tasks.find((task) => task.id === taskId);
    if (task && task.abortController) {
      task.abortController.abort();
      task.status = "canceled";
    }
  }

  removeTask(taskId: string) {
    const taskIndex = this.tasks.findIndex((task) => task.id === taskId);
    if (taskIndex !== -1) {
      this.tasks.splice(taskIndex, 1);
    }
  }

  getTasks() {
    return this.tasks;
  }

  clearTasks() {
    this.tasks = [];
  }

  private async processQueue() {
    while (this.activeUploads < this.maxConcurrentUploads) {
      const nextTask = this.tasks.find((task) => task.status === "pending");
      if (!nextTask) {
        break;
      }

      this.activeUploads++;
      nextTask.status = "deleting";

      try {
        if (nextTask.key) {
          await this.deleteObject(nextTask);
          nextTask.status = "completed";
        } else {
          throw new Error("Task key is undefined");
        }
      } catch (error: any) {
        nextTask.status = "failed";
        nextTask.error = error.message;
      } finally {
        this.activeUploads--;
        this.processQueue(); // Continue with the next task
      }
    }
  }

  private async deleteObject(task: DeleteTask) {
    const { key, bucketName, prefix } = task;
    const abortController = new AbortController();
    task.abortController = abortController;
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: prefix + key,
    });

    await this.s3Client.send(command, { abortSignal: abortController.signal });
    task.progress = 100;
  }
}

export default DeleteTaskManager;
