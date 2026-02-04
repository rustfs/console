"use client"

import * as React from "react"
import { useSyncExternalStore } from "react"
import { TaskManager, type TaskHandler } from "@/lib/task-manager"
import { createUploadTaskHelpers } from "@/lib/upload-task"
import { createDeleteTaskHelpers } from "@/lib/delete-task"
import { useS3Optional } from "@/contexts/s3-context"

export type UploadTask = {
  id: string
  kind: "upload"
  status: string
  progress: number
  error?: string
  displayName: string
  subInfo: string
  actionLabel: string
}

export type AnyTask = {
  id: string
  kind: string
  status: string
  progress: number
  error?: string
  displayName: string
  subInfo: string
  actionLabel: string
}

const emptyTasks: AnyTask[] = []
const emptyManager = {
  getTasks: () => emptyTasks,
  enqueue: () => {},
  removeTask: () => {},
  clearTasks: () => {},
  subscribe: () => () => {},
} as unknown as TaskManager<AnyTask, string>

const TaskContext = React.createContext<{
  taskManager: TaskManager<AnyTask, string>
  addUploadFiles: (items: { file: File; key: string }[], bucketName: string) => void
  addDeleteKeys: (keys: string[], bucketName: string, prefix?: string, options?: { forceDelete?: boolean }) => void
  isTaskPanelOpen: boolean
  setTaskPanelOpen: (open: boolean) => void
}>({
  taskManager: emptyManager,
  addUploadFiles: () => {},
  addDeleteKeys: () => {},
  isTaskPanelOpen: false,
  setTaskPanelOpen: () => {},
})

type ManagerState = {
  manager: TaskManager<AnyTask, string>
  uploadHelpers: ReturnType<typeof createUploadTaskHelpers>
  deleteHelpers: ReturnType<typeof createDeleteTaskHelpers>
} | null

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const client = useS3Optional()
  const [isTaskPanelOpen, setTaskPanelOpen] = React.useState(false)
  const [managerState, setManagerState] = React.useState<ManagerState>(null)

  React.useEffect(() => {
    if (!client) return
    const uploadHelpers = createUploadTaskHelpers(client, {
      chunkSize: 16,
      maxRetries: 3,
      retryDelay: 1000,
    })
    const deleteHelpers = createDeleteTaskHelpers(client, {
      maxRetries: 3,
      retryDelay: 1000,
    })
    const manager = new TaskManager<AnyTask, string>({
      handlers: {
        upload: uploadHelpers.handler as TaskHandler<unknown, string>,
        delete: deleteHelpers.handler as TaskHandler<unknown, string>,
      },
      maxConcurrent: 6,
      maxRetries: 3,
      retryDelay: 1000,
    })
    setManagerState({ manager, uploadHelpers, deleteHelpers })
  }, [client])

  const taskManager = managerState?.manager ?? emptyManager

  const addUploadFiles = React.useCallback(
    (items: { file: File; key: string }[], bucketName: string) => {
      if (!managerState) return
      const { manager, uploadHelpers } = managerState
      const allTasks = manager.getTasks() as Array<{ status: string; bucketName?: string; key?: string }>
      const activeKeys = new Set(
        allTasks
          .filter((t) => ["pending", "running", "failed", "paused"].includes(t.status))
          .map((t) => `${t.bucketName ?? ""}/${t.key ?? ""}`),
      )
      const newTasks = uploadHelpers
        .createTasks(items, bucketName)
        .filter((t) => !activeKeys.has(`${t.bucketName}/${t.key}`))
      manager.enqueue(newTasks as AnyTask[])
    },
    [managerState],
  )

  const addDeleteKeys = React.useCallback(
    (keys: string[], bucketName: string, prefix?: string, options?: { forceDelete?: boolean }) => {
      if (!managerState) return
      const { manager, deleteHelpers } = managerState
      const newTasks = deleteHelpers.createTasks(keys, bucketName, prefix, options)
      manager.enqueue(newTasks as AnyTask[])
    },
    [managerState],
  )

  const value = React.useMemo(
    () => ({
      taskManager,
      addUploadFiles,
      addDeleteKeys,
      isTaskPanelOpen,
      setTaskPanelOpen,
    }),
    [taskManager, addUploadFiles, addDeleteKeys, isTaskPanelOpen],
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
  return tasks as AnyTask[]
}

export function useAddUploadFiles() {
  const { addUploadFiles } = React.useContext(TaskContext)
  return addUploadFiles
}

export function useAddDeleteKeys() {
  const { addDeleteKeys } = React.useContext(TaskContext)
  return addDeleteKeys
}

export function useTaskPanelOpen() {
  const { isTaskPanelOpen, setTaskPanelOpen } = React.useContext(TaskContext)
  return { isTaskPanelOpen, setTaskPanelOpen }
}
