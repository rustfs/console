"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { TaskItem } from "./item"
import type { AnyTask } from "@/contexts/task-context"

interface TaskPanelProps {
  tasks: readonly AnyTask[]
  onClearFinishedTasks: () => void
}

export function TaskPanel({ tasks, onClearFinishedTasks }: TaskPanelProps) {
  const { t } = useTranslation()
  const [tab, setTab] = React.useState("pending")

  const pending = tasks.filter((task) => task.status === "pending")
  const processing = tasks.filter((task) => task.status === "running")
  const completed = tasks.filter((task) => task.status === "completed")
  const failed = tasks.filter((task) => task.status === "failed")
  const canceled = tasks.filter((task) => task.status === "canceled")

  const total = tasks.length
  const finished = completed.length + failed.length + canceled.length
  const percentage = total === 0 ? 100 : Math.floor((finished / total) * 100)

  React.useEffect(() => {
    if (processing.length > 0) setTab("processing")
    else if (pending.length > 0) setTab("pending")
    else if (completed.length > 0) setTab("completed")
    else if (failed.length > 0) setTab("failed")
    else if (canceled.length > 0) setTab("canceled")
    else setTab("pending")
  }, [processing.length, pending.length, completed.length, failed.length, canceled.length])

  const statuses = [
    { value: "pending", label: t("Pending", { count: pending.length }), tasks: pending },
    { value: "processing", label: t("Processing (with count)", { count: processing.length }), tasks: processing },
    { value: "completed", label: t("Completed", { count: completed.length }), tasks: completed },
    { value: "failed", label: t("Failed", { count: failed.length }), tasks: failed },
    { value: "canceled", label: `${t("Canceled")} (${canceled.length})`, tasks: canceled },
  ]

  const renderList = (list: readonly AnyTask[]) => (
    <div className="flex flex-col gap-3">
      {list.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t("No Data")}</p>
      ) : (
        list.map((task) => <TaskItem key={task.id} task={task} />)
      )}
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {total > 0 && (
        <div className="space-y-4 px-5 pt-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="font-mono text-2xl text-foreground">
              {finished}/{total}
            </div>
            {finished > 0 && (
              <Button variant="ghost" size="sm" className="h-auto px-2" onClick={onClearFinishedTasks}>
                {t("Clear Records")}
              </Button>
            )}
          </div>
          <Progress value={percentage} className="h-1" aria-label={t("Task Management")} />
        </div>
      )}

      <div className="px-5 py-5">
        <NativeSelect
          value={tab}
          onChange={(event) => setTab(event.target.value)}
          aria-label={t("Status")}
          className="w-full"
        >
          {statuses.map((status) => (
            <NativeSelectOption key={status.value} value={status.value}>
              {status.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {renderList(statuses.find((status) => status.value === tab)?.tasks ?? [])}
      </div>
      <div
        className="space-y-2 border-t bg-muted/20 px-5 py-4 text-xs leading-relaxed text-muted-foreground"
        role="note"
      >
        <p>{t("Browser Warning")}</p>
        <p>{t("Cache Warning")}</p>
      </div>
    </div>
  )
}
