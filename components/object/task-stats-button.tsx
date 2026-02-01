"use client"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Spinner } from "@/components/ui/spinner"
import { useTaskManager, useTasks, useTaskPanelOpen } from "@/contexts/task-context"
import { RiCheckLine } from "@remixicon/react"
import * as React from "react"
import { useTranslation } from "react-i18next"
import { TaskTaskPanel } from "./task-task-panel"

export function TaskStatsButton() {
  const { t } = useTranslation()
  const tasks = useTasks()
  const taskManager = useTaskManager()
  const { isTaskPanelOpen, setTaskPanelOpen } = useTaskPanelOpen()

  const processing = tasks.filter((task) => task.status === "running")
  const completed = tasks.filter((task) => task.status === "completed")
  const failed = tasks.filter((task) => task.status === "failed")
  const total = tasks.length

  if (total === 0) return null

  return (
    <Drawer open={isTaskPanelOpen} onOpenChange={setTaskPanelOpen} direction="right">
      <DrawerTrigger asChild>
        <Button variant="outline">
          {processing.length > 0 ? (
            <div className="flex items-center gap-2">
              <Spinner className="size-3 text-muted-foreground" />
              <span>
                {t("In Progress", {
                  total,
                  processing: processing.length,
                  completed: completed.length,
                })}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <RiCheckLine className="size-4 text-emerald-600" />
              <span>
                {t("Task Completed", { completed: completed.length, failed: failed.length })}
              </span>
            </div>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="sm:max-w-sm">
        <DrawerHeader>
          <DrawerTitle>{t("Task Management")}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-auto p-4">
          <TaskTaskPanel tasks={tasks} onClearTasks={() => taskManager.clearTasks()} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
