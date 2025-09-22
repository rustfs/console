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

    // 批量添加任务
    this.tasks.push(...newTasks);
    console.log('🗑️ Added keys to delete queue:', keys.length, 'keys');
    console.log('🔍 Current state:', {
      isStarted: this.isStarted,
      isProcessing: this.isProcessing,
      activeDeletes: this.activeDeletes,
      totalTasks: this.tasks.length,
      pendingTasks: this.tasks.filter(t => t.status === 'pending').length,
    });
    // 强制重置状态并立即处理队列
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
      this.isProcessing = false; // 确保重置处理状态
    }

    // 立即处理队列
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

    // 取消所有待处理的任务
    this.tasks
      .filter(task => task.status === 'pending')
      .forEach(task => {
        task.status = 'canceled';
      });

    // 取消所有正在进行的删除
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
      // 如果任务正在进行，先取消它
      const task = this.tasks[taskIndex];
      if (task.status === 'deleting' && task.abortController) {
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
    // 先取消所有正在进行的任务
    this.cancel();
    // 清空任务列表
    this.tasks.splice(0, this.tasks.length);
    // 重置所有状态
    this.activeDeletes = 0;
    this.isStarted = false;
    this.isProcessing = false;
  }

  // 重写队列处理逻辑，使用更简单的方式
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

      // 启动新的删除任务
      while (this.activeDeletes < this.maxConcurrentUploads && pendingTasks.length > 0) {
        const nextTask = pendingTasks.shift();
        if (!nextTask) break;

        this.activeDeletes++;
        console.log(`▶️ Starting delete task: ${nextTask.id} (${nextTask.key})`);

        // 立即启动删除任务，不等待
        this.executeDelete(nextTask);
      }

      // 如果还有待处理的任务，延迟继续处理
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
        // 所有任务完成时自动重置 isStarted
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

      // 检查是否是取消操作
      if (error.name === 'AbortError' || error.message?.includes('canceled')) {
        task.status = 'canceled';
        console.log(`❌ Delete canceled: ${task.key}`);
        return;
      }

      // 检查是否应该重试
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

      // 继续处理队列 - 这是关键的修复
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
    // 如果任务被取消，不重试
    if (task.status === 'canceled') {
      return false;
    }

    // 如果达到最大重试次数，不重试
    if ((task.retryCount || 0) >= this.maxRetries) {
      return false;
    }

    // 检查错误类型，某些错误不应该重试
    const errorMessage = error.message?.toLowerCase() || '';
    const nonRetryableErrors = ['access denied', 'forbidden', 'invalid credentials', 'bucket not found', 'no such key'];

    return !nonRetryableErrors.some(msg => errorMessage.includes(msg));
  }

  private async retryTask(task: DeleteTask) {
    task.retryCount = (task.retryCount || 0) + 1;
    task.status = 'pending';
    task.progress = 0;
    task.error = undefined;

    // 等待一段时间后重试
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
