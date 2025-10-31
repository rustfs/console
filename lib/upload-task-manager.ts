import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  ListPartsCommand,
} from '@aws-sdk/client-s3';

export interface UploadTask {
  id: string;
  file: File;
  bucketName: string;
  prefix?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'canceled' | 'paused';
  progress: number;
  error?: string;
  abortController?: AbortController;
  retryCount?: number;
  uploadId?: string;
  completedParts?: { ETag: string; PartNumber: number }[];
  _pauseRequested?: boolean;
}

export interface TaskManagerConfig {
  chunkSize?: number; // in MB
  maxConcurrentUploads?: number;
  maxRetries?: number;
  retryDelay?: number;
}

class UploadTaskManager {
  private tasks = reactive<UploadTask[]>([]);
  private maxConcurrentUploads: number;
  private chunkSize: number;
  private s3Client: S3Client;
  private activeUploads: number = 0;
  private maxRetries: number;
  private retryDelay: number;
  private isStarted: boolean = false;

  constructor(s3Client: S3Client, config: TaskManagerConfig = {}) {
    this.s3Client = s3Client;
    this.chunkSize = (config.chunkSize ?? 5) * 1024 * 1024; // Default 5MB
    this.maxConcurrentUploads = config.maxConcurrentUploads ?? 6;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  addFiles(files: File[], bucketName: string, prefix?: string) {
    // Filter existing tasks only from incomplete tasks
    const existKeys = new Set(
      this.tasks
        .filter(task => ['pending', 'uploading', 'failed', 'paused'].includes(task.status))
        .map(task => `${task.bucketName}/${task.prefix || ''}${task.file.name}`)
    );
    // Filter out existing tasks
    const newTasks = files
      .filter(file => !existKeys.has(`${bucketName}/${prefix || ''}${file.name}`))
      .map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`,
        file,
        status: 'pending' as const,
        progress: 0,
        bucketName,
        prefix: prefix ?? '',
        retryCount: 0,
      }));

    this.tasks.push(...newTasks);
    this.start();
  }

  start() {
    if (!this.isStarted) {
      this.isStarted = true;
    }
    this.processQueue();
  }

  stop() {
    this.isStarted = false;
  }

  cancel() {
    // Cancel all pending tasks
    this.tasks
      .filter(task => task.status === 'pending')
      .forEach(task => {
        task.status = 'canceled';
      });

    // Cancel all ongoing uploads
    this.tasks
      .filter(task => task.status === 'uploading' && task.abortController)
      .forEach(task => {
        task.abortController?.abort();
        task.status = 'canceled';
      });
  }

  cancelTask(taskId: string) {
    const task = this.tasks.find(task => task.id === taskId);
    if (task) {
      task._pauseRequested = false;
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
      if (task?.status === 'uploading' && task.abortController) {
        task.abortController.abort();
      }
      this.tasks.splice(taskIndex, 1);
    }
  }

  getTasks() {
    return this.tasks;
  }

  clearTasks() {
    // Cancel all ongoing tasks first
    this.cancel();
    // Clear task list
    this.tasks.splice(0, this.tasks.length);
    // Reset state
    this.activeUploads = 0;
    this.isStarted = false;
  }

  pauseTask(taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status === 'uploading') {
      task._pauseRequested = true;
      task.abortController?.abort();
    }
  }

  async resumeTask(taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status === 'paused') {
      task._pauseRequested = false; // Clear pause flag before resuming
      // 1. Validate if uploadId is valid
      try {
        if (task.uploadId) {
          const listParts = await this.s3Client.send(
            new ListPartsCommand({
              Bucket: task.bucketName,
              Key: (task.prefix || '') + task.file.name,
              UploadId: task.uploadId,
            })
          );

          // 2. Update task.completedParts based on S3 returned parts
          task.completedParts = (listParts.Parts || []).map((p: any) => ({
            ETag: p.ETag,
            PartNumber: p.PartNumber,
          }));

          // 3. Start resumable upload
          this.startUpload(task);
        } else {
          // No uploadId, restart upload directly
          task.completedParts = [];
          this.startUpload(task);
        }
      } catch (e: any) {
        if (e.name === 'NoSuchUpload' || (typeof e.message === 'string' && e.message.includes('Invalid upload id'))) {
          // uploadId expired, restart multipart upload
          task.uploadId = undefined;
          task.completedParts = [];
          this.startUpload(task);
        } else {
          throw e;
        }
      }
    }
  }

  // Simplified queue processing logic
  private async processQueue() {
    if (!this.isStarted) {
      return;
    }

    // Start new upload tasks
    while (this.activeUploads < this.maxConcurrentUploads) {
      const nextTask = this.tasks.find(task => task.status === 'pending');
      if (!nextTask) {
        break;
      }

      this.activeUploads++;
      // Don't wait, start async upload directly
      this.startUpload(nextTask).catch(console.error);
    }

    // If there are still pending tasks, continue processing
    if (this.tasks.some(task => task.status === 'pending')) {
      // Use setTimeout to avoid blocking main thread
      setTimeout(() => {
        this.processQueue();
      }, 100);
    }
  }

  private async startUpload(task: UploadTask) {
    task.status = 'uploading';
    task.progress = 0;

    try {
      if (task.file.size > this.chunkSize) {
        await this.multipartUpload(task);
      } else {
        await this.putObject(task);
      }
      task.status = 'completed';
      task.progress = 100;
    } catch (error: any) {
      // Check if this is a "pause" operation
      if (task._pauseRequested && (error.message === 'Upload paused' || error.message === 'Request aborted')) {
        task.status = 'paused';
        return;
      }
      // Only cleanup on actual cancellation
      if (error.name === 'AbortError' || error.message?.includes('canceled')) {
        // Call AbortMultipartUploadCommand here
        task.status = 'canceled';
        return;
      }

      console.error('Upload failed:', error.message, 'Task:', task.id);

      // Check if should retry
      if (this.shouldRetry(task, error)) {
        await this.retryTask(task);
      } else {
        task.status = 'failed';
        task.error = error.message;
      }
    } finally {
      this.activeUploads--;
      // Continue processing queue
      if (this.isStarted) {
        setTimeout(() => this.processQueue(), 50);
      }
    }
  }

  private shouldRetry(task: UploadTask, error: any): boolean {
    // If task is canceled, don't retry
    if (task.status === 'canceled') {
      return false;
    }

    // If max retries reached, don't retry
    if ((task.retryCount || 0) >= this.maxRetries) {
      return false;
    }

    // If S3 returns 4xx error, mark as failed directly
    if (
      error.$metadata &&
      error.$metadata.httpStatusCode &&
      error.$metadata.httpStatusCode >= 400 &&
      error.$metadata.httpStatusCode < 500
    ) {
      return false;
    }

    // Check error type, some errors should not be retried
    const errorMessage = error.message?.toLowerCase() || '';
    const nonRetryableErrors = [
      'access denied',
      'forbidden',
      'invalid credentials',
      'bucket not found',
      'file not found',
    ];

    return !nonRetryableErrors.some(msg => errorMessage.includes(msg));
  }

  private async retryTask(task: UploadTask) {
    task.retryCount = (task.retryCount || 0) + 1;
    task.status = 'pending';
    task.progress = 0;
    task.error = undefined;

    // Wait before retrying
    const retryCount = task.retryCount || 1;
    await new Promise(resolve => setTimeout(resolve, this.retryDelay * retryCount));

    console.debug(`Retrying task ${task.id}, attempt ${retryCount}`);
  }

  private async putObject(task: UploadTask) {
    const { file, bucketName, prefix } = task;
    const abortController = new AbortController();
    task.abortController = abortController;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: prefix + file.name,
      Body: file,
      ContentType: file.type || 'application/octet-stream',
    });

    await this.s3Client.send(command, { abortSignal: abortController.signal });
    task.progress = 100;
  }

  private async multipartUpload(task: UploadTask) {
    const { file, bucketName, prefix } = task;
    const abortController = new AbortController();
    task.abortController = abortController;

    const Key = prefix + file.name;
    let uploadId: string | undefined = task.uploadId;
    let completedParts: { ETag: string; PartNumber: number }[] = task.completedParts || [];

    try {
      if (!uploadId) {
        // Create multipart upload
        const createCommand = new CreateMultipartUploadCommand({
          Bucket: bucketName,
          Key: Key,
          ContentType: file.type || 'application/octet-stream',
        });
        const createResponse = await this.s3Client.send(createCommand, {
          abortSignal: abortController.signal,
        });
        uploadId = createResponse.UploadId;
        task.uploadId = uploadId;
        task.completedParts = [];
      }
      if (!uploadId) {
        throw new Error('Failed to create multipart upload');
      }
      const totalChunks = Math.ceil(file.size / this.chunkSize);
      // Upload parts
      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        if (abortController.signal.aborted) {
          throw new Error('Upload paused');
        }
        // Skip already completed parts
        if (completedParts.some(p => p.PartNumber === partNumber)) continue;
        const start = (partNumber - 1) * this.chunkSize;
        const end = Math.min(start + this.chunkSize, file.size);
        const chunk = file.slice(start, end);
        const uploadPartCommand = new UploadPartCommand({
          Bucket: bucketName,
          Key: Key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: chunk,
        });
        const { ETag } = await this.s3Client.send(uploadPartCommand, {
          abortSignal: abortController.signal,
        });
        if (!ETag) {
          throw new Error(`Failed to upload part ${partNumber}`);
        }
        completedParts.push({ ETag, PartNumber: partNumber });
        task.completedParts = completedParts;
        task.progress = Math.round((completedParts.length / totalChunks) * 100);
      }
      // Complete multipart upload
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: Key,
        UploadId: uploadId,
        MultipartUpload: { Parts: completedParts },
      });
      await this.s3Client.send(completeCommand, {
        abortSignal: abortController.signal,
      });
      // Clean up uploadId and completedParts after upload completes
      task.uploadId = undefined;
      task.completedParts = undefined;
    } catch (error: any) {
      // Only call AbortMultipartUploadCommand when not paused
      if (!task._pauseRequested) {
        try {
          const { AbortMultipartUploadCommand } = await import('@aws-sdk/client-s3');
          const abortCommand = new AbortMultipartUploadCommand({
            Bucket: bucketName,
            Key: Key,
            UploadId: uploadId,
          });
          await this.s3Client.send(abortCommand);
        } catch (cleanupError) {
          console.warn('Failed to cleanup multipart upload:', cleanupError);
        }
      }
      throw error;
    }
  }
}

export default UploadTaskManager;
