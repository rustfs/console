"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RiAddLine, RiRefreshLine, RiDeleteBin5Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Page } from "@/components/page";
import { PageHeader } from "@/components/page-header";
import { BucketSelector } from "@/components/bucket-selector";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { useBucket } from "@/hooks/use-bucket";
import { LifecycleNewForm } from "@/components/lifecycle/lifecycle-new-form";
import { useDialog } from "@/lib/ui/dialog";
import { useMessage } from "@/lib/ui/message";
import type { ColumnDef } from "@tanstack/react-table";

interface LifecycleRule {
  ID?: string;
  Status?: string;
  Filter?: {
    Prefix?: string;
    Tag?: { Key: string; Value: string };
    And?: {
      Prefix?: string;
      Tags?: Array<{ Key: string; Value: string }>;
    };
  };
  Expiration?: {
    Days?: number;
    Date?: string;
    StorageClass?: string;
    ExpiredObjectDeleteMarker?: boolean;
  };
  NoncurrentVersionExpiration?: { NoncurrentDays?: number };
  Transitions?: Array<{ Days?: number; StorageClass?: string }>;
  NoncurrentVersionTransitions?: Array<{
    NoncurrentDays?: number;
    StorageClass?: string;
  }>;
}

export default function LifecyclePage() {
  const { t } = useTranslation();
  const message = useMessage();
  const dialog = useDialog();
  const {
    getBucketLifecycleConfiguration,
    deleteBucketLifecycle,
    putBucketLifecycleConfiguration,
  } = useBucket();

  const [bucketName, setBucketName] = useState<string | null>(null);
  const [data, setData] = useState<LifecycleRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFormOpen, setNewFormOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!bucketName) {
      setData([]);
      return;
    }
    setLoading(true);
    try {
      const response = await getBucketLifecycleConfiguration(bucketName);
      const rules = [...(response?.Rules ?? [])]
        .map((r) => r as LifecycleRule)
        .sort((a, b) => (a.ID ?? "").localeCompare(b.ID ?? ""));
      setData(rules);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [bucketName, getBucketLifecycleConfiguration]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns: ColumnDef<LifecycleRule>[] = useMemo(
    () => [
      {
        id: "type",
        header: () => t("Type"),
        accessorFn: (row) =>
          row.Transitions || row.NoncurrentVersionTransitions
            ? "Transition"
            : "Expire",
      },
      {
        id: "version",
        header: () => t("Version"),
        accessorFn: (row) =>
          row.NoncurrentVersionExpiration || row.NoncurrentVersionTransitions
            ? t("Non-current Version")
            : t("Current Version"),
      },
      {
        id: "deleteMarker",
        header: () => t("Expiration Delete Mark"),
        accessorFn: (row) =>
          row.Expiration?.ExpiredObjectDeleteMarker ? t("On") : t("Off"),
      },
      {
        id: "tier",
        header: () => t("Tier"),
        accessorFn: (row) =>
          row.Transitions?.[0]?.StorageClass ||
          row.NoncurrentVersionTransitions?.[0]?.StorageClass ||
          "--",
      },
      {
        id: "prefix",
        header: () => t("Prefix"),
        accessorFn: (row) =>
          row.Filter?.Prefix || row.Filter?.And?.Prefix || "",
      },
      {
        id: "timeCycle",
        header: () => `${t("Time Cycle")} (${t("Days")})`,
        accessorFn: (row) =>
          row.Expiration?.Days ??
          row.NoncurrentVersionExpiration?.NoncurrentDays ??
          row.Transitions?.[0]?.Days ??
          row.NoncurrentVersionTransitions?.[0]?.NoncurrentDays ??
          "",
      },
      {
        id: "status",
        header: () => t("Status"),
        accessorFn: (row) => row.Status ?? "-",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.Status === "Enabled" ? "secondary" : "destructive"
            }
          >
            {row.original.Status ?? "-"}
          </Badge>
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
              <RiDeleteBin5Line className="size-4" aria-hidden />
              <span>{t("Delete")}</span>
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- confirmDelete used in cell, stable ref
    [t],
  );

  const { table } = useDataTable<LifecycleRule>({
    data,
    columns,
    getRowId: (row) => row.ID ?? JSON.stringify(row),
  });

  const confirmDelete = (row: LifecycleRule) => {
    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to delete this rule?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: () => handleRowDelete(row),
    });
  };

  const handleRowDelete = async (row: LifecycleRule) => {
    const remaining = data.filter((item) => item.ID !== row.ID);
    if (!bucketName) return;

    try {
      if (remaining.length === 0) {
        await deleteBucketLifecycle(bucketName);
      } else {
        await putBucketLifecycleConfiguration(bucketName, {
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
            />
            <Button
              variant="outline"
              onClick={() => setNewFormOpen(true)}
              disabled={!bucketName}
            >
              <RiAddLine className="size-4" aria-hidden />
              <span>{t("Add Lifecycle Rule")}</span>
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Lifecycle")}</h1>
      </PageHeader>

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Data")}
        emptyDescription={t(
          "Create lifecycle rules to automate object transitions and expiration.",
        )}
      />

      {bucketName && (
        <LifecycleNewForm
          open={newFormOpen}
          onOpenChange={setNewFormOpen}
          bucketName={bucketName}
          onSuccess={loadData}
        />
      )}
    </Page>
  );
}
