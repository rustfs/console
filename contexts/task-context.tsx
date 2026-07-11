"use client"

import * as React from "react"
import { useSyncExternalStore } from "react"
import { TaskManager, type TaskManagerApi } from "@/lib/task-manager"
import { createUploadTaskHelpers, type UploadTask } from "@/lib/upload-task"
import { createDeleteTaskHelpers, type AnyDeleteTask } from "@/lib/delete-task"
import { useS3Optional } from "@/contexts/s3-context"

export type AnyTask = UploadTask | AnyDeleteTask

const emptyTasks: readonly AnyTask[] = []
const emptyManager: TaskManagerApi<AnyTask> = {
  getTasks: () => emptyTasks,
  enqueue: () => {},
  cancelTask: () => false,
  cancelAll: () => {},
  removeFinishedTask: () => false,
  clearFinishedTasks: () => {},
  dispose: () => {},
  subscribe: () => () => {},
}

const TaskContext = React.createContext<{
  taskManager: TaskManagerApi<AnyTask>
  addUploadFiles: (items: { file: File; key: string }[], bucketName: string) => void
  addDeleteKeys: (keys: string[], bucketName: string, prefix?: string, options?: { forceDelete?: boolean }) => void
  addDeleteFolder: (prefix: string, bucketName: string, options?: { forceDelete?: boolean }) => void
  isTaskPanelOpen: boolean
  setTaskPanelOpen: (open: boolean) => void
}>({
  taskManager: emptyManager,
  addUploadFiles: () => {},
  addDeleteKeys: () => {},
  addDeleteFolder: () => {},
  isTaskPanelOpen: false,
  setTaskPanelOpen: () => {},
})

type ManagerState = {
  manager: TaskManager<AnyTask>
  uploadHelpers: ReturnType<typeof createUploadTaskHelpers>
  deleteHelpers: ReturnType<typeof createDeleteTaskHelpers>
} | null

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const client = useS3Optional()
  const [isTaskPanelOpen, setTaskPanelOpen] = React.useState(false)
  const [managerState, setManagerState] = React.useState<ManagerState>(null)

  React.useEffect(() => {
    if (!client) {
      setManagerState(null)
      return
    }
    const uploadHelpers = createUploadTaskHelpers(client, {
      chunkSize: 16,
      maxRetries: 3,
      retryDelay: 1000,
    })
    const deleteHelpers = createDeleteTaskHelpers(client, {
      maxRetries: 3,
      retryDelay: 1000,
    })
    const manager = new TaskManager<AnyTask>({
      handlers: {
        upload: uploadHelpers.handler,
        delete: deleteHelpers.handler,
        "delete-folder": deleteHelpers.folderHandler,
      },
      maxConcurrent: 6,
      maxRetries: 3,
      retryDelay: 1000,
    })
    setManagerState({ manager, uploadHelpers, deleteHelpers })

    return () => manager.dispose()
  }, [client])

  const taskManager = managerState?.manager ?? emptyManager

  const addUploadFiles = React.useCallback(
    (items: { file: File; key: string }[], bucketName: string) => {
      if (!managerState) return
      const { manager, uploadHelpers } = managerState
      const allTasks = manager.getTasks()
      const activeKeys = new Set(
        allTasks
          .filter(
            (task): task is UploadTask =>
              task.kind === "upload" && (task.status === "pending" || task.status === "running"),
          )
          .map((task) => `${task.bucketName}/${task.key}`),
      )
      const newTasks = uploadHelpers
        .createTasks(items, bucketName)
        .filter((t) => !activeKeys.has(`${t.bucketName}/${t.key}`))
      manager.enqueue(newTasks)
    },
    [managerState],
  )

  const addDeleteKeys = React.useCallback(
    (keys: string[], bucketName: string, prefix?: string, options?: { forceDelete?: boolean }) => {
      if (!managerState) return
      const { manager, deleteHelpers } = managerState
      const newTasks = deleteHelpers.createTasks(keys, bucketName, prefix, options)
      manager.enqueue(newTasks)
    },
    [managerState],
  )

  const addDeleteFolder = React.useCallback(
    (prefix: string, bucketName: string, options?: { forceDelete?: boolean }) => {
      if (!managerState) return
      const { manager, deleteHelpers } = managerState
      const task = deleteHelpers.createFolderDeleteTask(prefix, bucketName, options)
      manager.enqueue([task])
    },
    [managerState],
  )

  const value = React.useMemo(
    () => ({
      taskManager,
      addUploadFiles,
      addDeleteKeys,
      addDeleteFolder,
      isTaskPanelOpen,
      setTaskPanelOpen,
    }),
    [taskManager, addUploadFiles, addDeleteKeys, addDeleteFolder, isTaskPanelOpen],
  )

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>
}

export function useTaskManager() {
  const { taskManager } = React.useContext(TaskContext)
  return taskManager
}

export function useTasks() {
  const { taskManager } = React.useContext(TaskContext)
  const tasks = useSyncExternalStore(
    (cb) => taskManager.subscribe(cb),
    () => taskManager.getTasks(),
    () => taskManager.getTasks(),
  )
  return tasks
}

export function useAddUploadFiles() {
  const { addUploadFiles } = React.useContext(TaskContext)
  return addUploadFiles
}

export function useAddDeleteKeys() {
  const { addDeleteKeys } = React.useContext(TaskContext)
  return addDeleteKeys
}

export function useAddDeleteFolder() {
  const { addDeleteFolder } = React.useContext(TaskContext)
  return addDeleteFolder
}

export function useTaskPanelOpen() {
  const { isTaskPanelOpen, setTaskPanelOpen } = React.useContext(TaskContext)
  return { isTaskPanelOpen, setTaskPanelOpen }
}
