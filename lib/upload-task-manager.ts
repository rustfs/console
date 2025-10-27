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
    // 只从未完成的任务中过滤已存在的任务
    const existKeys = new Set(
      this.tasks
        .filter(task => ['pending', 'uploading', 'failed', 'paused'].includes(task.status))
        .map(task => `${task.bucketName}/${task.prefix || ''}${task.file.name}`)
    );
    // 过滤已存在的任务
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
    // 取消所有待处理的任务
    this.tasks
      .filter(task => task.status === 'pending')
      .forEach(task => {
        task.status = 'canceled';
      });

    // 取消所有正在进行的上传
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
      // 如果任务正在进行，先取消它
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
    // 先取消所有正在进行的任务
    this.cancel();
    // 清空任务列表
    this.tasks.splice(0, this.tasks.length);
    // 重置状态
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
      task._pauseRequested = false; // 恢复前清除暂停标记
      // 1. 校验 uploadId 是否有效
      try {
        if (task.uploadId) {
          const listParts = await this.s3Client.send(
            new ListPartsCommand({
              Bucket: task.bucketName,
              Key: (task.prefix || '') + task.file.name,
              UploadId: task.uploadId,
            })
          );

          // 2. 以 S3 返回的分片为准，更新 task.completedParts
          task.completedParts = (listParts.Parts || []).map((p: any) => ({
            ETag: p.ETag,
            PartNumber: p.PartNumber,
          }));

          // 3. 开始断点续传
          this.startUpload(task);
        } else {
          // 没有 uploadId，直接重新上传
          task.completedParts = [];
          this.startUpload(task);
        }
      } catch (e: any) {
        if (e.name === 'NoSuchUpload' || (typeof e.message === 'string' && e.message.includes('Invalid upload id'))) {
          // uploadId 已失效，重新发起分片上传
          task.uploadId = undefined;
          task.completedParts = [];
          this.startUpload(task);
        } else {
          throw e;
        }
      }
    }
  }

  // 简化的队列处理逻辑
  private async processQueue() {
    if (!this.isStarted) {
      return;
    }

    // 启动新的上传任务
    while (this.activeUploads < this.maxConcurrentUploads) {
      const nextTask = this.tasks.find(task => task.status === 'pending');
      if (!nextTask) {
        break;
      }

      this.activeUploads++;
      // 不等待，直接启动异步上传
      this.startUpload(nextTask).catch(console.error);
    }

    // 如果还有待处理的任务，继续处理
    if (this.tasks.some(task => task.status === 'pending')) {
      // 使用 setTimeout 避免阻塞主线程
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
      // 判断是否为“暂停”操作
      if (task._pauseRequested && (error.message === 'Upload paused' || error.message === 'Request aborted')) {
        task.status = 'paused';
        return;
      }
      // 只有真正取消时才清理
      if (error.name === 'AbortError' || error.message?.includes('canceled')) {
        // 这里才调用 AbortMultipartUploadCommand
        task.status = 'canceled';
        return;
      }

      console.error('Upload failed:', error.message, 'Task:', task.id);

      // 检查是否应该重试
      if (this.shouldRetry(task, error)) {
        await this.retryTask(task);
      } else {
        task.status = 'failed';
        task.error = error.message;
      }
    } finally {
      this.activeUploads--;
      // 继续处理队列
      if (this.isStarted) {
        setTimeout(() => this.processQueue(), 50);
      }
    }
  }

  private shouldRetry(task: UploadTask, error: any): boolean {
    // 如果任务被取消，不重试
    if (task.status === 'canceled') {
      return false;
    }

    // 如果达到最大重试次数，不重试
    if ((task.retryCount || 0) >= this.maxRetries) {
      return false;
    }

    // 如果是 S3 返回的 4xx 错误，直接 failed
    if (
      error.$metadata &&
      error.$metadata.httpStatusCode &&
      error.$metadata.httpStatusCode >= 400 &&
      error.$metadata.httpStatusCode < 500
    ) {
      return false;
    }

    // 检查错误类型，某些错误不应该重试
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

    // 等待一段时间后重试
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
        // 创建分片上传
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
      // 上传分片
      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        if (abortController.signal.aborted) {
          throw new Error('Upload paused');
        }
        // 跳过已完成分片
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
      // 完成分片上传
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: Key,
        UploadId: uploadId,
        MultipartUpload: { Parts: completedParts },
      });
      await this.s3Client.send(completeCommand, {
        abortSignal: abortController.signal,
      });
      // 上传完成后清理 uploadId 和 completedParts
      task.uploadId = undefined;
      task.completedParts = undefined;
    } catch (error: any) {
      // 只在“非暂停”情况下才调用 AbortMultipartUploadCommand
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
