"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { useBucket } from "@/hooks/use-bucket";
import { useTiers, type TierRow } from "@/hooks/use-tiers";
import { useMessage } from "@/lib/ui/message";

interface LifecycleNewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketName: string | null;
  onSuccess?: () => void;
}

interface Tag {
  key: string;
  value: string;
}

export function LifecycleNewForm({
  open,
  onOpenChange,
  bucketName,
  onSuccess,
}: LifecycleNewFormProps) {
  const { t } = useTranslation();
  const message = useMessage();
  const {
    putBucketLifecycleConfiguration,
    getBucketVersioning,
    getBucketLifecycleConfiguration,
  } = useBucket();
  const { listTiers } = useTiers();

  const [activeTab, setActiveTab] = useState<"expire" | "transition">("expire");
  const [versionType, setVersionType] = useState("current");
  const [days, setDays] = useState(1);
  const [storageType, setStorageType] = useState("");
  const [prefix, setPrefix] = useState("");
  const [expiredDeleteMark, setExpiredDeleteMark] = useState(false);
  const [tags, setTags] = useState<Tag[]>([{ key: "", value: "" }]);
  const [tiers, setTiers] = useState<Array<{ label: string; value: string }>>(
    [],
  );
  const [versioningStatus, setVersioningStatus] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const versionOptions = useMemo(
    () => [
      { label: t("Current Version"), value: "current" },
      { label: t("Non-current Version"), value: "non-current" },
    ],
    [t],
  );

  const loadTiers = useCallback(async () => {
    try {
      const res = await listTiers();
      if (res) {
        const tierOptions = res.map((item: TierRow) => {
          const config = item[item.type] as { name?: string } | undefined;
          return {
            label: config?.name ?? "",
            value: config?.name ?? "",
          };
        });
        setTiers(tierOptions);
        if (!storageType && tierOptions.length > 0) {
          setStorageType(tierOptions[0].value);
        }
      }
    } catch {
      setTiers([]);
    }
  }, [listTiers, storageType]);

  const loadVersioningStatus = useCallback(async () => {
    if (!bucketName) {
      setVersioningStatus(false);
      return;
    }
    try {
      const resp = await getBucketVersioning(bucketName);
      setVersioningStatus(resp.Status === "Enabled");
    } catch {
      setVersioningStatus(false);
    }
  }, [bucketName, getBucketVersioning]);

  useEffect(() => {
    if (open) {
      loadTiers();
      loadVersioningStatus();
    }
  }, [open, loadTiers, loadVersioningStatus]);

  const resetForm = useCallback(() => {
    setActiveTab("expire");
    setVersionType("current");
    setDays(1);
    setStorageType(tiers[0]?.value ?? "");
    setPrefix("");
    setExpiredDeleteMark(false);
    setTags([{ key: "", value: "" }]);
  }, [tiers]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const addTag = () => {
    setTags((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeTag = (index: number) => {
    if (tags.length === 1) return;
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, field: "key" | "value", value: string) => {
    setTags((prev) =>
      prev.map((tag, i) => (i === index ? { ...tag, [field]: value } : tag)),
    );
  };

  const validate = () => {
    if (!days || days < 1) {
      message.error(t("Please enter valid days"));
      return false;
    }
    if (activeTab === "transition" && !storageType) {
      message.error(t("Please select storage type"));
      return false;
    }
    return true;
  };

  const buildFilter = () => {
    const validTags = tags.filter((tag) => tag.key && tag.value);
    if (!prefix && validTags.length === 0) {
      return undefined;
    }

    const filter: Record<string, unknown> = {};
    const [firstTag] = validTags;

    if (firstTag && validTags.length === 1 && !prefix) {
      filter.Tag = { Key: firstTag.key, Value: firstTag.value };
    } else if (validTags.length > 0) {
      filter.And = {
        Tags: validTags.map((tag) => ({ Key: tag.key, Value: tag.value })),
        ...(prefix ? { Prefix: prefix } : {}),
      };
    } else if (prefix) {
      filter.Prefix = prefix;
    }

    return Object.keys(filter).length ? filter : undefined;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!bucketName) {
      message.error(t("Bucket name is required"));
      return;
    }
    setSubmitting(true);
    try {
      let currentConfig: { Rules?: unknown[] } | null = null;
      try {
        currentConfig = (await getBucketLifecycleConfiguration(bucketName)) as {
          Rules?: unknown[];
        };
      } catch {
        currentConfig = null;
      }

      const newRule: Record<string, unknown> = {
        ID: crypto.randomUUID(),
        Status: "Enabled",
        Filter: buildFilter(),
      };

      const daysValue = Number(days);

      if (activeTab === "expire") {
        if (versionType === "non-current") {
          newRule.NoncurrentVersionExpiration = { NoncurrentDays: daysValue };
          if (expiredDeleteMark) {
            newRule.ExpiredObjectDeleteMarker = true;
          }
        } else {
          newRule.Expiration = {
            Days: daysValue,
            ...(expiredDeleteMark ? { ExpiredObjectDeleteMarker: true } : {}),
          };
        }
      } else {
        if (versionType === "non-current") {
          newRule.NoncurrentVersionTransitions = [
            { NoncurrentDays: daysValue, StorageClass: storageType },
          ];
        } else {
          newRule.Transitions = [
            { Days: daysValue, StorageClass: storageType },
          ];
        }
      }

      const existingRules = currentConfig?.Rules ?? [];
      const payload = { Rules: [...existingRules, newRule] };

      await putBucketLifecycleConfiguration(bucketName, payload);
      message.success(t("Create Success"));
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      message.error((error as Error).message || t("Failed to create rule"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {t("Add Lifecycle Rule")} ({t("Bucket")}: {bucketName || ""})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "expire" | "transition")}
            className="flex flex-col gap-4"
          >
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="expire">{t("Expiration")}</TabsTrigger>
              <TabsTrigger value="transition">{t("Transition")}</TabsTrigger>
            </TabsList>

            <TabsContent value="expire" className="mt-0 space-y-6">
              <div className="space-y-4">
                {versioningStatus && (
                  <Field>
                    <FieldLabel>{t("Object Version")}</FieldLabel>
                    <FieldContent>
                      <Select
                        value={versionType}
                        onValueChange={setVersionType}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {versionOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>
                )}

                <Field>
                  <FieldLabel>{t("Time Cycle")}</FieldLabel>
                  <FieldDescription>
                    {t("Set the time cycle for the rule")}
                  </FieldDescription>
                  <FieldContent>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="w-32"
                        placeholder={t("Days")}
                      />
                      <span className="text-sm text-muted-foreground">
                        {t("Days After")}
                      </span>
                    </div>
                  </FieldContent>
                </Field>
              </div>

              <details className="space-y-4">
                <summary className="cursor-pointer text-sm font-medium text-primary">
                  {t("More Configurations")}
                </summary>
                <div className="mt-4 space-y-4">
                  <Field>
                    <FieldLabel>{t("Prefix")}</FieldLabel>
                    <FieldContent>
                      <Input
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        placeholder={t("Please enter prefix")}
                      />
                    </FieldContent>
                  </Field>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-sm font-medium">
                        {t("Tags")}
                      </FieldLabel>
                      <Button variant="outline" size="sm" onClick={addTag}>
                        <RiAddLine className="size-4" aria-hidden />
                        {t("Add Tag")}
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="space-y-3">
                        {tags.map((tag, index) => (
                          <div
                            key={index}
                            className="grid gap-2 md:grid-cols-2 md:items-center md:gap-4"
                          >
                            <Input
                              value={tag.key}
                              onChange={(e) =>
                                updateTag(index, "key", e.target.value)
                              }
                              placeholder={t("Tag Name")}
                            />
                            <div className="flex items-center gap-2">
                              <Input
                                value={tag.value}
                                onChange={(e) =>
                                  updateTag(index, "value", e.target.value)
                                }
                                placeholder={t("Tag Value")}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                disabled={tags.length === 1}
                                onClick={() => removeTag(index)}
                              >
                                <RiDeleteBinLine
                                  className="size-4"
                                  aria-hidden
                                />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </details>

              {versionType === "current" && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    {t("Advanced Settings")}
                  </summary>
                  <Field className="mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <FieldLabel className="text-sm font-medium">
                          {t("Delete Marker Handling")}
                        </FieldLabel>
                        <FieldDescription>
                          {t(
                            "If no versions remain, delete references to this object",
                          )}
                        </FieldDescription>
                      </div>
                      <Switch
                        checked={expiredDeleteMark}
                        onCheckedChange={setExpiredDeleteMark}
                      />
                    </div>
                  </Field>
                </details>
              )}
            </TabsContent>

            <TabsContent value="transition" className="mt-0 space-y-6">
              <div className="space-y-4">
                {versioningStatus && (
                  <Field>
                    <FieldLabel>{t("Object Version")}</FieldLabel>
                    <FieldContent>
                      <Select
                        value={versionType}
                        onValueChange={setVersionType}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {versionOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>
                )}

                <Field>
                  <FieldLabel>{t("Time Cycle")}</FieldLabel>
                  <FieldContent>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="w-32"
                        placeholder={t("Days")}
                      />
                      <span className="text-sm text-muted-foreground">
                        {t("Days After")}
                      </span>
                    </div>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>{t("Storage Type")}</FieldLabel>
                  <FieldContent>
                    <Select value={storageType} onValueChange={setStorageType}>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t("Please select storage type")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {tiers.map((tier) => (
                          <SelectItem key={tier.value} value={tier.value}>
                            {tier.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
              </div>

              <details className="space-y-4">
                <summary className="cursor-pointer text-sm font-medium text-primary">
                  {t("More Configurations")}
                </summary>
                <div className="mt-4 space-y-4">
                  <Field>
                    <FieldLabel>{t("Prefix")}</FieldLabel>
                    <FieldContent>
                      <Input
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        placeholder={t("Please enter prefix")}
                      />
                    </FieldContent>
                  </Field>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-sm font-medium">
                        {t("Tags")}
                      </FieldLabel>
                      <Button variant="outline" size="sm" onClick={addTag}>
                        <RiAddLine className="size-4" aria-hidden />
                        {t("Add Tag")}
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="space-y-3">
                        {tags.map((tag, index) => (
                          <div
                            key={index}
                            className="grid gap-2 rounded-md border p-3 md:grid-cols-2 md:items-center md:gap-4"
                          >
                            <Input
                              value={tag.key}
                              onChange={(e) =>
                                updateTag(index, "key", e.target.value)
                              }
                              placeholder={t("Tag Name")}
                            />
                            <div className="flex items-center gap-2">
                              <Input
                                value={tag.value}
                                onChange={(e) =>
                                  updateTag(index, "value", e.target.value)
                                }
                                placeholder={t("Tag Value")}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                disabled={tags.length === 1}
                                onClick={() => removeTag(index)}
                              >
                                <RiDeleteBinLine
                                  className="size-4"
                                  aria-hidden
                                />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
