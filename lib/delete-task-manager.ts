import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface DeleteTask {
  id: string;
  key: string;
  bucketName: string;
  prefix?: string;
  status: 'pending' | 'deleting' | 'completed' | 'failed' | 'canceled';
  progress: number;
  error?: string;
  abortController?: AbortController;
  retryCount?: number;
}

export interface TaskManagerConfig {
  chunkSize?: number; // in MB
  maxConcurrentUploads?: number;
  maxRetries?: number;
  retryDelay?: number;
}

class DeleteTaskManager {
  private tasks = reactive<DeleteTask[]>([]);
  private maxConcurrentUploads: number;
  private chunkSize: number;
  private s3Client: S3Client;
  private activeDeletes: number = 0;
  private maxRetries: number;
  private retryDelay: number;
  private isStarted: boolean = false;
  private isProcessing: boolean = false;

  constructor(s3Client: S3Client, config: TaskManagerConfig = {}) {
    this.s3Client = s3Client;
    this.chunkSize = (config.chunkSize ?? 5) * 1024 * 1024; // Default 5MB
    this.maxConcurrentUploads = config.maxConcurrentUploads ?? 6;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  addKeys(keys: string[], bucketName: string, prefix?: string) {
    const newTasks = keys.map(key => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${key}`,
      key,
      status: 'pending' as const,
      progress: 0,
      bucketName,
      prefix: prefix ?? '',
      error: undefined,
      abortController: undefined,
      retryCount: 0,
    }));

    // Add tasks in batch
    this.tasks.push(...newTasks);
    console.log('🗑️ Added keys to delete queue:', keys.length, 'keys');
    console.log('🔍 Current state:', {
      isStarted: this.isStarted,
      isProcessing: this.isProcessing,
      activeDeletes: this.activeDeletes,
      totalTasks: this.tasks.length,
      pendingTasks: this.tasks.filter(t => t.status === 'pending').length,
    });
    // Force reset state and process queue immediately
    this.isStarted = true;
    this.isProcessing = false;
    this.processQueue();
  }

  start() {
    console.log('🚀 Starting delete task manager, current state:', {
      isStarted: this.isStarted,
      isProcessing: this.isProcessing,
    });

    if (!this.isStarted) {
      this.isStarted = true;
      this.isProcessing = false; // Ensure processing state is reset
    }

    // Process queue immediately
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  stop() {
    this.isStarted = false;
    this.isProcessing = false;
    console.log('⏹️ Stopping delete task manager');
  }

  cancel() {
    console.log('❌ Canceling all delete tasks');

    // Cancel all pending tasks
    this.tasks
      .filter(task => task.status === 'pending')
      .forEach(task => {
        task.status = 'canceled';
      });

    // Cancel all ongoing deletions
    this.tasks
      .filter(task => task.status === 'deleting' && task.abortController)
      .forEach(task => {
        task.abortController?.abort();
        task.status = 'canceled';
      });
  }

  cancelTask(taskId: string) {
    const task = this.tasks.find(task => task.id === taskId);
    if (task) {
      console.log('❌ Canceling task:', taskId);
      if (task.abortController) {
        task.abortController.abort();
      }
      task.status = 'canceled';
    }
  }

  removeTask(taskId: string) {
    const taskIndex = this.tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      // If task is in progress, cancel it first
      const task = this.tasks[taskIndex];
      if (task?.status === 'deleting' && task.abortController) {
        task.abortController.abort();
      }
      this.tasks.splice(taskIndex, 1);
      console.log('🗑️ Removed task:', taskId);
    }
  }

  getTasks() {
    return this.tasks;
  }

  clearTasks() {
    console.log('🧹 Clearing all delete tasks');
    // Cancel all ongoing tasks first
    this.cancel();
    // Clear task list
    this.tasks.splice(0, this.tasks.length);
    // Reset all state
    this.activeDeletes = 0;
    this.isStarted = false;
    this.isProcessing = false;
  }

  // Rewrite queue processing logic using a simpler approach
  private async processQueue() {
    if (!this.isStarted) {
      console.log('⏸️ Task manager not started, skipping queue processing');
      return;
    }

    if (this.isProcessing) {
      console.log('⏸️ Already processing queue, skipping');
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Starting queue processing');

    try {
      const pendingTasks = this.tasks.filter(task => task.status === 'pending');
      console.log(`🔄 Processing queue: ${pendingTasks.length} pending, ${this.activeDeletes} active`);

      // Start new delete tasks
      while (this.activeDeletes < this.maxConcurrentUploads && pendingTasks.length > 0) {
        const nextTask = pendingTasks.shift();
        if (!nextTask) break;

        this.activeDeletes++;
        console.log(`▶️ Starting delete task: ${nextTask.id} (${nextTask.key})`);

        // Start delete task immediately, don't wait
        this.executeDelete(nextTask);
      }

      // If there are still pending tasks, continue processing after delay
      const remainingPending = this.tasks.filter(task => task.status === 'pending').length;
      if (remainingPending > 0) {
        console.log(`⏳ ${remainingPending} tasks remaining, will retry in 1 second`);
        setTimeout(() => {
          this.isProcessing = false;
          this.processQueue();
        }, 1000);
      } else {
        console.log('✅ No more pending tasks, queue processing complete');
        this.isProcessing = false;
        // Auto-reset isStarted when all tasks complete
        if (this.activeDeletes === 0) {
          this.isStarted = false;
        }
      }
    } catch (error) {
      console.error('❌ Error in processQueue:', error);
      this.isProcessing = false;
    }
  }

  private async executeDelete(task: DeleteTask) {
    task.status = 'deleting';
    task.progress = 0;

    try {
      console.log(`🗑️ Deleting: ${task.key}`);
      await this.deleteObject(task);
      task.status = 'completed';
      task.progress = 100;
      console.log(`✅ Deleted successfully: ${task.key}`);
    } catch (error: any) {
      console.error(`❌ Delete failed for ${task.key}:`, error.message);

      // Check if this is a cancel operation
      if (error.name === 'AbortError' || error.message?.includes('canceled')) {
        task.status = 'canceled';
        console.log(`❌ Delete canceled: ${task.key}`);
        return;
      }

      // Check if should retry
      if (this.shouldRetry(task, error)) {
        console.log(`🔄 Will retry delete: ${task.key} (attempt ${(task.retryCount || 0) + 1})`);
        await this.retryTask(task);
      } else {
        task.status = 'failed';
        task.error = error.message;
        console.log(`💥 Delete permanently failed: ${task.key}`);
      }
    } finally {
      this.activeDeletes--;
      console.log(`📊 Delete completed, ${this.activeDeletes} active deletes remaining`);

      // Continue processing queue - this is the key fix
      if (this.isStarted) {
        setTimeout(() => {
          if (!this.isProcessing) {
            this.processQueue();
          }
        }, 100);
      }
    }
  }

  private shouldRetry(task: DeleteTask, error: any): boolean {
    // If task is canceled, don't retry
    if (task.status === 'canceled') {
      return false;
    }

    // If max retries reached, don't retry
    if ((task.retryCount || 0) >= this.maxRetries) {
      return false;
    }

    // Check error type, some errors should not be retried
    const errorMessage = error.message?.toLowerCase() || '';
    const nonRetryableErrors = ['access denied', 'forbidden', 'invalid credentials', 'bucket not found', 'no such key'];

    return !nonRetryableErrors.some(msg => errorMessage.includes(msg));
  }

  private async retryTask(task: DeleteTask) {
    task.retryCount = (task.retryCount || 0) + 1;
    task.status = 'pending';
    task.progress = 0;
    task.error = undefined;

    // Wait before retrying
    const retryCount = task.retryCount || 1;
    await new Promise(resolve => setTimeout(resolve, this.retryDelay * retryCount));

    console.log(`🔄 Retrying delete task ${task.id}, attempt ${retryCount}`);
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
