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
  tasks: AnyTask[]
  onClearTasks: () => void
}

export function TaskPanel({ tasks, onClearTasks }: TaskPanelProps) {
  const { t } = useTranslation()
  const [tab, setTab] = React.useState("pending")

  const pending = tasks.filter((task) => task.status === "pending")
  const processing = tasks.filter((task) => task.status === "running")
  const completed = tasks.filter((task) => task.status === "completed")
  const failed = tasks.filter((task) => task.status === "failed")

  const total = tasks.length
  const percentage = total === 0 ? 100 : Math.floor((completed.length / total) * 100)

  React.useEffect(() => {
    if (processing.length > 0) setTab("processing")
    else if (pending.length > 0) setTab("pending")
    else if (completed.length > 0) setTab("completed")
    else setTab("pending")
  }, [processing.length, pending.length, completed.length])

  const withCount = (key: string, count: number) => t(key).replace(/\{[^}]*\}/g, String(count))

  const tabs = [
    { value: "pending", label: withCount("Pending", pending.length) },
    { value: "processing", label: withCount("Processing (with count)", processing.length) },
    { value: "completed", label: withCount("Completed", completed.length) },
    { value: "failed", label: withCount("Failed", failed.length) },
  ]

  const renderList = (list: AnyTask[]) => (
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
      <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <AlertDescription className="space-y-2 text-sm leading-relaxed">
          <p>
            <span className="font-medium text-amber-600 dark:text-amber-300">{t("Browser Warning")}</span>
          </p>
          <p>
            <span className="font-medium text-amber-600 dark:text-amber-300">{t("Cache Warning")}</span>
          </p>
        </AlertDescription>
      </Alert>

      {total > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {total - pending.length - processing.length}/{total}
            </div>
            <Button variant="ghost" size="sm" className="h-auto px-2" onClick={onClearTasks}>
              {t("Clear Records")}
            </Button>
          </div>
          <Progress value={percentage} className="h-[3px]" />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
        <TabsList className="justify-start overflow-x-auto">
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
      </Tabs>
    </div>
  )
}
