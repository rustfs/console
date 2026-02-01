"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RiAddLine, RiCloseLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMessage } from "@/lib/ui/message";

interface SiteReplicationNewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SiteFormValue {
  name: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
}

interface SiteFormErrors {
  endpoint: string;
  accessKey: string;
  secretKey: string;
}

const createRemoteEntry = (): SiteFormValue => ({
  name: "",
  endpoint: "",
  accessKey: "",
  secretKey: "",
});

const createErrorState = (): SiteFormErrors => ({
  endpoint: "",
  accessKey: "",
  secretKey: "",
});

export function SiteReplicationNewForm({
  open,
  onOpenChange,
  onSuccess,
}: SiteReplicationNewFormProps) {
  const { t } = useTranslation();
  const message = useMessage();

  const [currentSite, setCurrentSite] = useState<SiteFormValue>({
    name: "",
    endpoint: "http://127.0.0.1:7000",
    accessKey: "rustfsadmin",
    secretKey: "",
  });

  const [remoteSites, setRemoteSites] = useState<SiteFormValue[]>([
    createRemoteEntry(),
  ]);

  const [currentErrors, setCurrentErrors] =
    useState<SiteFormErrors>(createErrorState());

  const [remoteErrors, setRemoteErrors] = useState<SiteFormErrors[]>([
    createErrorState(),
  ]);

  const resetForm = useCallback(() => {
    setCurrentSite({
      name: "",
      endpoint: "http://127.0.0.1:7000",
      accessKey: "rustfsadmin",
      secretKey: "",
    });
    setRemoteSites([createRemoteEntry()]);
    setCurrentErrors(createErrorState());
    setRemoteErrors([createErrorState()]);
  }, []);

  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const updateCurrentSite = (field: keyof SiteFormValue, value: string) => {
    setCurrentSite((prev) => ({ ...prev, [field]: value }));
    if (
      field === "endpoint" ||
      field === "accessKey" ||
      field === "secretKey"
    ) {
      if (value.trim()) {
        setCurrentErrors((prev) => ({ ...prev, [field]: "" }));
      }
    }
  };

  const updateRemoteSite = (
    index: number,
    field: keyof SiteFormValue,
    value: string,
  ) => {
    setRemoteSites((prev) =>
      prev.map((site, i) => (i === index ? { ...site, [field]: value } : site)),
    );
    if (
      field === "endpoint" ||
      field === "accessKey" ||
      field === "secretKey"
    ) {
      if (value.trim()) {
        setRemoteErrors((prev) =>
          prev.map((err, i) => (i === index ? { ...err, [field]: "" } : err)),
        );
      }
    }
  };

  const addRemoteSite = () => {
    setRemoteSites((prev) => [...prev, createRemoteEntry()]);
    setRemoteErrors((prev) => [...prev, createErrorState()]);
  };

  const removeRemoteSite = (index: number) => {
    if (remoteSites.length <= 1) return;
    setRemoteSites((prev) => prev.filter((_, i) => i !== index));
    setRemoteErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    let valid = true;
    const newCurrentErrors = { ...currentErrors };
    const newRemoteErrors = [...remoteErrors];

    if (!currentSite.endpoint.trim()) {
      newCurrentErrors.endpoint = t("Endpoint is required");
      valid = false;
    }
    if (!currentSite.accessKey.trim()) {
      newCurrentErrors.accessKey = t("Access Key is required");
      valid = false;
    }
    if (!currentSite.secretKey.trim()) {
      newCurrentErrors.secretKey = t("Secret Key is required");
      valid = false;
    }

    remoteSites.forEach((site, index) => {
      const errors = newRemoteErrors[index] ?? createErrorState();
      if (!site.endpoint.trim()) {
        errors.endpoint = t("Endpoint is required");
        valid = false;
      }
      if (!site.accessKey.trim()) {
        errors.accessKey = t("Access Key is required");
        valid = false;
      }
      if (!site.secretKey.trim()) {
        errors.secretKey = t("Secret Key is required");
        valid = false;
      }
      newRemoteErrors[index] = errors;
    });

    setCurrentErrors(newCurrentErrors);
    setRemoteErrors(newRemoteErrors);
    return valid;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }
    console.log("Current Site:", { ...currentSite });
    console.log(
      "Remote Sites:",
      remoteSites.map((site) => ({ ...site })),
    );
    message.success(t("Site replication configuration saved"));
    onSuccess?.();
    onOpenChange(false);
    resetForm();
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle>{t("Add Site Replication")}</DialogTitle>
          <DialogDescription>
            {t(
              "Note: AccessKey and SecretKey values are required for each site when adding or editing peer sites",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">{t("Current Site")}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current-site-name">{t("Site Name")}</Label>
                <Input
                  id="current-site-name"
                  value={currentSite.name}
                  onChange={(e) => updateCurrentSite("name", e.target.value)}
                  placeholder={t("Site Name")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="current-site-endpoint">{t("Endpoint *")}</Label>
                <Input
                  id="current-site-endpoint"
                  value={currentSite.endpoint}
                  onChange={(e) =>
                    updateCurrentSite("endpoint", e.target.value)
                  }
                  placeholder={t("Endpoint")}
                />
                {currentErrors.endpoint && (
                  <p className="text-sm text-destructive">
                    {currentErrors.endpoint}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="current-site-access">{t("Access Key *")}</Label>
                <Input
                  id="current-site-access"
                  value={currentSite.accessKey}
                  onChange={(e) =>
                    updateCurrentSite("accessKey", e.target.value)
                  }
                  placeholder={t("Access Key")}
                />
                {currentErrors.accessKey && (
                  <p className="text-sm text-destructive">
                    {currentErrors.accessKey}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="current-site-secret">{t("Secret Key *")}</Label>
                <Input
                  id="current-site-secret"
                  type="password"
                  value={currentSite.secretKey}
                  onChange={(e) =>
                    updateCurrentSite("secretKey", e.target.value)
                  }
                  placeholder={t("Secret Key")}
                />
                {currentErrors.secretKey && (
                  <p className="text-sm text-destructive">
                    {currentErrors.secretKey}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold">{t("Remote Site")}</h3>
              <Button
                type="button"
                variant="secondary"
                className="inline-flex items-center gap-2 self-start"
                onClick={addRemoteSite}
              >
                <RiAddLine className="size-4" aria-hidden />
                {t("Add Site")}
              </Button>
            </div>

            <div className="space-y-4">
              {remoteSites.map((site, index) => (
                <div key={index} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("Remote Site")} {index + 1}
                    </p>
                    {remoteSites.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="-mr-2 h-8 w-8"
                        aria-label={t("Delete")}
                        onClick={() => removeRemoteSite(index)}
                      >
                        <RiCloseLine className="size-4" aria-hidden />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`remote-site-name-${index}`}>
                        {t("Site Name")}
                      </Label>
                      <Input
                        id={`remote-site-name-${index}`}
                        value={site.name}
                        onChange={(e) =>
                          updateRemoteSite(index, "name", e.target.value)
                        }
                        placeholder={t("Site Name")}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor={`remote-site-endpoint-${index}`}>
                        {t("Endpoint *")}
                      </Label>
                      <Input
                        id={`remote-site-endpoint-${index}`}
                        value={site.endpoint}
                        onChange={(e) =>
                          updateRemoteSite(index, "endpoint", e.target.value)
                        }
                        placeholder={t("Endpoint")}
                      />
                      {remoteErrors[index]?.endpoint && (
                        <p className="text-sm text-destructive">
                          {remoteErrors[index].endpoint}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`remote-site-access-${index}`}>
                        {t("Access Key *")}
                      </Label>
                      <Input
                        id={`remote-site-access-${index}`}
                        value={site.accessKey}
                        onChange={(e) =>
                          updateRemoteSite(index, "accessKey", e.target.value)
                        }
                        placeholder={t("Access Key")}
                      />
                      {remoteErrors[index]?.accessKey && (
                        <p className="text-sm text-destructive">
                          {remoteErrors[index].accessKey}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`remote-site-secret-${index}`}>
                        {t("Secret Key *")}
                      </Label>
                      <Input
                        id={`remote-site-secret-${index}`}
                        type="password"
                        value={site.secretKey}
                        onChange={(e) =>
                          updateRemoteSite(index, "secretKey", e.target.value)
                        }
                        placeholder={t("Secret Key")}
                      />
                      {remoteErrors[index]?.secretKey && (
                        <p className="text-sm text-destructive">
                          {remoteErrors[index].secretKey}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button type="button" variant="outline" onClick={handleCancel}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={handleSave}>
            {t("Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
