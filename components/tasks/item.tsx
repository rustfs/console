"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiCloseCircleLine, RiDeleteBinLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useTaskManager } from "@/contexts/task-context"
import type { AnyTask } from "@/contexts/task-context"

interface TaskItemProps {
  task: AnyTask
}

const statusMap: Record<string, string> = {
  pending: "waiting",
  running: "in progress",
  completed: "success",
  failed: "failed",
  canceled: "canceled",
}

export function TaskItem({ task }: TaskItemProps) {
  const { t } = useTranslation()
  const taskManager = useTaskManager()

  const statusKey = statusMap[task.status] ?? "in progress"
  const statusText = `${t(task.actionLabel)}${t(statusKey)}`
  const isActive = task.status === "pending" || task.status === "running"
  const isFinished = task.status === "completed" || task.status === "failed" || task.status === "canceled"

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3 group">
        <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{task.displayName}</div>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto shrink-0 px-2 text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            aria-label={t("Cancel")}
            onClick={() => taskManager.cancelTask(task.id)}
          >
            <RiCloseCircleLine className="size-4" aria-hidden />
          </Button>
        )}
        {isFinished && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto shrink-0 px-2 text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            aria-label={t("Delete Record")}
            onClick={() => taskManager.removeFinishedTask(task.id)}
          >
            <RiDeleteBinLine className="size-4 text-destructive" aria-hidden />
          </Button>
        )}
      </div>
      <Progress value={task.progress} className="h-[2px]" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>{task.subInfo}</div>
        <div>{statusText}</div>
      </div>
    </div>
  )
}
