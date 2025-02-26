import { CompleteMultipartUploadCommand, CreateMultipartUploadCommand, PutObjectCommand, S3Client, UploadPartCommand } from "@aws-sdk/client-s3";

export interface UploadTask {
  id: string;
  file: File;
  bucketName: string;
  prefix?: string;
  status: "pending" | "uploading" | "completed" | "failed" | "canceled";
  progress: number;
  error?: string;
  abortController?: AbortController;
}

export interface TaskManagerConfig {
  chunkSize?: number; // in MB
  maxConcurrentUploads?: number;
}

class UploadTaskManager {
  private tasks = reactive<UploadTask[]>([]);
  private maxConcurrentUploads: number;
  private chunkSize: number;
  private s3Client: S3Client;
  private activeUploads: number = 0;

  constructor(s3Client: S3Client, config: TaskManagerConfig) {
    this.s3Client = s3Client;
    this.chunkSize = (config.chunkSize ?? 5) * 1024 * 1024; // Default 5MB
    this.maxConcurrentUploads = config.maxConcurrentUploads ?? 6;
  }

  addFiles(files: File[], bucketName: string, prefix?: string) {
    files.forEach((file) => {
      const task: UploadTask = {
        id: `${Date.now()}-${file.name}`,
        file,
        status: "pending",
        progress: 0,
        bucketName,
        prefix: prefix ?? "",
      };
      this.tasks.push(task);
    });

    console.debug("Added files to upload queue", files);
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
      if (!nextTask) { break; }

      this.activeUploads++;
      nextTask.status = "uploading";

      try {
        if (nextTask.file.size > this.chunkSize) {
          await this.multipartUpload(nextTask);
        } else {
          await this.putObject(nextTask);
        }
        nextTask.status = "completed";
      } catch (error: any) {
        nextTask.status = "failed";
        nextTask.error = error.message;
      } finally {
        this.activeUploads--;
        this.processQueue(); // Continue with the next task
      }
    }
  }

  private async putObject(task: UploadTask) {
    const { file, bucketName, prefix } = task;
    const abortController = new AbortController();
    task.abortController = abortController;
    console.log('putObject', task);

    const fileBuffer = await file.arrayBuffer();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: prefix + task.file.name,
      // Body: file,
      // https://github.com/aws/aws-sdk-js-v3/issues/6834
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
    });

    await this.s3Client.send(command, { abortSignal: abortController.signal });
    task.progress = 100;
  }

  private async multipartUpload(task: UploadTask) {
    const { file, bucketName, prefix } = task;
    const abortController = new AbortController();
    task.abortController = abortController;

    const Key = prefix + task.file.name;
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: Key
    });
    const { UploadId } = await this.s3Client.send(createCommand);

    const totalChunks = Math.ceil(file.size / this.chunkSize);
    let completedParts = [];

    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      const start = (partNumber - 1) * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);

      const chunk = file.slice(start, end);
      const uploadPartCommand = new UploadPartCommand({
        Bucket: bucketName,
        Key: Key,
        UploadId,
        PartNumber: partNumber,
        Body: chunk,
      });

      const { ETag } = await this.s3Client.send(uploadPartCommand, { abortSignal: abortController.signal });
      completedParts.push({ ETag, PartNumber: partNumber });

      task.progress = Math.round((partNumber / totalChunks) * 100);
    }

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: Key,
      UploadId,
      MultipartUpload: { Parts: completedParts },
    });

    await this.s3Client.send(completeCommand);
  }
}

export default UploadTaskManager;
