"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
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

  const tabs = [
    { value: "pending", label: t("Pending", { count: pending.length }) },
    { value: "processing", label: t("Processing (with count)", { count: processing.length }) },
    { value: "completed", label: t("Completed", { count: completed.length }) },
    { value: "failed", label: t("Failed", { count: failed.length }) },
    { value: "canceled", label: `${t("Canceled")} (${canceled.length})` },
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
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertDescription className="space-y-2 text-sm leading-relaxed">
          <p>
            <span className="font-medium text-destructive">{t("Browser Warning")}</span>
          </p>
          <p>
            <span className="font-medium text-destructive">{t("Cache Warning")}</span>
          </p>
        </AlertDescription>
      </Alert>

      {total > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {finished}/{total}
            </div>
            {finished > 0 && (
              <Button variant="ghost" size="sm" className="h-auto px-2" onClick={onClearFinishedTasks}>
                {t("Clear Records")}
              </Button>
            )}
          </div>
          <Progress value={percentage} className="h-[3px]" />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
        <TabsList className="justify-start overflow-x-auto overflow-y-hidden">
          {tabs.map((tabItem) => (
            <TabsTrigger key={tabItem.value} value={tabItem.value} className="capitalize">
              {tabItem.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="pending" className="mt-0">
          {renderList(pending)}
        </TabsContent>
        <TabsContent value="processing" className="mt-0">
          {renderList(processing)}
        </TabsContent>
        <TabsContent value="completed" className="mt-0">
          {renderList(completed)}
        </TabsContent>
        <TabsContent value="failed" className="mt-0">
          {renderList(failed)}
        </TabsContent>
        <TabsContent value="canceled" className="mt-0">
          {renderList(canceled)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
