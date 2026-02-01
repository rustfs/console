"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RiAddLine, RiRefreshLine, RiDeleteBin7Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { BucketSelector } from "@/components/bucket-selector";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { useBucket } from "@/hooks/use-bucket";
import { ReplicationNewForm } from "@/components/replication/replication-new-form";
import { useDialog } from "@/lib/ui/dialog";
import { useMessage } from "@/lib/ui/message";
import type { ColumnDef } from "@tanstack/react-table";

interface ReplicationRule {
  ID?: string;
  Status?: string;
  Priority?: number;
  Filter?: { Prefix?: string };
  Destination?: { Bucket?: string; StorageClass?: string };
}

export default function ReplicationPage() {
  const { t } = useTranslation();
  const message = useMessage();
  const dialog = useDialog();
  const {
    getBucketReplication,
    putBucketReplication,
    deleteBucketReplication,
    deleteRemoteReplicationTarget,
  } = useBucket();

  const [bucketName, setBucketName] = useState<string | null>(null);
  const [data, setData] = useState<ReplicationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFormOpen, setNewFormOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!bucketName) {
      setData([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getBucketReplication(bucketName);
      setData(res?.ReplicationConfiguration?.Rules ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [bucketName, getBucketReplication]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns: ColumnDef<ReplicationRule>[] = useMemo(
    () => [
      {
        accessorKey: "ID",
        header: () => t("Rule ID"),
        cell: ({ row }) => <span>{row.original.ID || "-"}</span>,
      },
      {
        accessorKey: "Status",
        header: () => t("Status"),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.Status === "Enabled" ? "secondary" : "outline"
            }
          >
            {row.original.Status === "Enabled" ? t("Enabled") : t("Disabled")}
          </Badge>
        ),
      },
      {
        accessorKey: "Priority",
        header: () => t("Priority"),
        cell: ({ row }) => <span>{String(row.original.Priority ?? "-")}</span>,
      },
      {
        id: "Filter",
        header: () => t("Prefix"),
        cell: ({ row }) => <span>{row.original.Filter?.Prefix || "-"}</span>,
      },
      {
        id: "destination-bucket",
        header: () => t("Destination Bucket"),
        cell: ({ row }) => {
          const bucketArn = row.original.Destination?.Bucket || "";
          return <span>{bucketArn.replace(/^arn:aws:s3:::/, "") || "-"}</span>;
        },
      },
      {
        id: "destination-storage",
        header: () => t("Storage Class"),
        cell: ({ row }) => (
          <span>{row.original.Destination?.StorageClass || "-"}</span>
        ),
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => confirmDelete(row.original)}
            >
              <RiDeleteBin7Line className="size-4" aria-hidden />
              <span>{t("Delete")}</span>
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- confirmDelete used in cell, stable ref
    [t],
  );

  const { table } = useDataTable<ReplicationRule>({
    data,
    columns,
    getRowId: (row) => row.ID ?? JSON.stringify(row),
  });

  const confirmDelete = (rule: ReplicationRule) => {
    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to delete this replication rule?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: () => handleRowDelete(rule),
    });
  };

  const handleRowDelete = async (rule: ReplicationRule) => {
    const remaining = data.filter((item) => item !== rule);
    if (!bucketName) return;

    try {
      if (remaining.length === 0) {
        await deleteBucketReplication(bucketName);
        await deleteRemoteReplicationTarget(
          bucketName,
          rule.Destination?.Bucket ?? "",
        );
      } else {
        const currentConfig = await getBucketReplication(bucketName);
        const role = currentConfig?.ReplicationConfiguration?.Role;
        if (!role) {
          throw new Error("Replication configuration Role is missing");
        }
        await putBucketReplication(bucketName, {
          Role: role,
          Rules: remaining,
        });
      }
      message.success(t("Delete Success"));
      loadData();
    } catch (error) {
      message.error((error as Error).message || t("Delete Failed"));
    }
  };

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <BucketSelector
              value={bucketName}
              onChange={setBucketName}
              placeholder={t("Please select bucket")}
              selectorClass="sm:w-56"
            />
            <Button
              variant="outline"
              onClick={() => setNewFormOpen(true)}
              disabled={!bucketName}
            >
              <RiAddLine className="size-4" aria-hidden />
              <span>{t("Add Replication Rule")}</span>
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Bucket Replication")}</h1>
      </PageHeader>

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Data")}
        emptyDescription={t(
          "Add replication rules to sync objects across buckets.",
        )}
      />

      {bucketName && (
        <ReplicationNewForm
          open={newFormOpen}
          onOpenChange={setNewFormOpen}
          bucketName={bucketName}
          onSuccess={loadData}
        />
      )}
    </Page>
  );
}
