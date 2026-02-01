"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiDeleteBinLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useTaskManager } from "@/contexts/task-context"
import type { AnyTask } from "@/contexts/task-context"

interface TaskTaskItemProps {
  task: AnyTask
}

const statusMap: Record<string, string> = {
  pending: "waiting",
  running: "in progress",
  completed: "success",
  failed: "failed",
  paused: "paused",
  canceled: "canceled",
}

export function TaskTaskItem({ task }: TaskTaskItemProps) {
  const { t } = useTranslation()
  const taskManager = useTaskManager()

  const statusKey = statusMap[task.status] ?? "in progress"
  const statusText = `${t(task.actionLabel)}${t(statusKey)}`

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3 group">
        <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {task.displayName}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto shrink-0 px-2 text-xs opacity-0 group-hover:opacity-100"
          onClick={() => taskManager.removeTask(task.id)}
        >
          <RiDeleteBinLine className="size-4 text-red-500" />
        </Button>
      </div>
      <Progress value={task.progress} className="h-[2px]" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>{task.subInfo}</div>
        <div>{statusText}</div>
      </div>
    </div>
  )
}
