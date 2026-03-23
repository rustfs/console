"use client"

import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type {
  OidcConfigSource,
  OidcProviderFormErrors,
  OidcProviderFormValues,
  ValidateOidcConfigResponse,
} from "@/types/oidc"

interface OidcFormProps {
  values: OidcProviderFormValues
  errors: OidcProviderFormErrors
  source?: OidcConfigSource
  isCreateMode: boolean
  isReadOnly: boolean
  secretConfigured: boolean
  restartRequired: boolean
  isSaving: boolean
  isValidating: boolean
  validateResult: ValidateOidcConfigResponse | null
  onChange: <K extends keyof OidcProviderFormValues>(field: K, value: OidcProviderFormValues[K]) => void
  onSave: () => void
  onValidate: () => void
  onDelete: () => void
}

function sourceLabel(source: OidcConfigSource | undefined, t: (key: string) => string) {
  if (!source) return null
  return source === "env" ? t("Environment Managed") : t("Persisted Configuration")
}

export function OidcForm({
  values,
  errors,
  source,
  isCreateMode,
  isReadOnly,
  secretConfigured,
  restartRequired,
  isSaving,
  isValidating,
  validateResult,
  onChange,
  onSave,
  onValidate,
  onDelete,
}: OidcFormProps) {
  const { t } = useTranslation()
  const showRedirectUri = !values.redirect_uri_dynamic

  return (
    <div className="space-y-4 rounded-md border p-4 md:p-6">
      <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">
              {isCreateMode
                ? t("Add Provider")
                : values.display_name.trim() || values.provider_id || t("OIDC Provider")}
            </h2>
            {sourceLabel(source, t) ? <Badge variant="outline">{sourceLabel(source, t)}</Badge> : null}
            {!isCreateMode ? (
              <Badge variant={values.enabled ? "secondary" : "outline"}>
                {values.enabled ? t("Enabled") : t("Disabled")}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {isReadOnly
              ? t("Environment-managed providers are read-only")
              : t("Changes will take effect after RustFS restarts")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isCreateMode ? (
            <Button type="button" variant="outline" onClick={onValidate} disabled={isValidating || isSaving}>
              {isValidating ? t("Validating...") : t("Validate")}
            </Button>
          ) : null}
          {!isReadOnly ? (
            <Button type="button" onClick={onSave} disabled={isSaving || isValidating}>
              {isSaving ? t("Saving...") : t("Save")}
            </Button>
          ) : null}
          {!isCreateMode && !isReadOnly ? (
            <Button type="button" variant="outline" onClick={onDelete} disabled={isSaving || isValidating}>
              {t("Delete")}
            </Button>
          ) : null}
        </div>
      </div>

      {restartRequired ? (
        <Alert>
          <AlertTitle>{t("Restart Required")}</AlertTitle>
          <AlertDescription>{t("Changes will take effect after RustFS restarts")}</AlertDescription>
        </Alert>
      ) : null}

      {validateResult ? (
        <Alert variant={validateResult.valid ? "default" : "destructive"}>
          <AlertTitle>
            {validateResult.valid
              ? t("OIDC configuration validated successfully")
              : t("Failed to validate OIDC configuration")}
          </AlertTitle>
          <AlertDescription className="space-y-1">
            <p>{validateResult.message}</p>
            {validateResult.issuer ? (
              <p>
                <span className="font-medium">{t("Issuer")}:</span> {validateResult.issuer}
              </p>
            ) : null}
            {validateResult.authorization_endpoint ? (
              <p>
                <span className="font-medium">{t("Authorization Endpoint")}:</span>{" "}
                {validateResult.authorization_endpoint}
              </p>
            ) : null}
            {validateResult.token_endpoint ? (
              <p>
                <span className="font-medium">{t("Token Endpoint")}:</span> {validateResult.token_endpoint}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="provider_id">{t("Provider ID")}</FieldLabel>
          <FieldContent>
            <Input
              id="provider_id"
              value={values.provider_id}
              onChange={(event) => onChange("provider_id", event.target.value)}
              placeholder={t("Provider ID")}
              disabled={!isCreateMode}
            />
          </FieldContent>
          <FieldDescription>{t("Only letters, numbers, underscores, and hyphens are allowed.")}</FieldDescription>
          <FieldError>{errors.provider_id}</FieldError>
        </Field>

        <Field orientation="responsive" className="items-start gap-3 rounded-md border p-3">
          <FieldLabel htmlFor="enabled">{t("Enabled")}</FieldLabel>
          <FieldContent className="gap-2">
            <div className="flex items-center gap-3">
              <Switch
                id="enabled"
                checked={values.enabled}
                onCheckedChange={(checked) => onChange("enabled", checked)}
                disabled={isReadOnly}
              />
              <span className="text-xs text-muted-foreground">{values.enabled ? t("Enabled") : t("Disabled")}</span>
            </div>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="display_name">{t("Display Name")}</FieldLabel>
          <FieldContent>
            <Input
              id="display_name"
              value={values.display_name}
              onChange={(event) => onChange("display_name", event.target.value)}
              placeholder={t("Display Name")}
              disabled={isReadOnly}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="config_url">{t("Configuration URL")}</FieldLabel>
          <FieldContent>
            <Input
              id="config_url"
              value={values.config_url}
              onChange={(event) => onChange("config_url", event.target.value)}
              placeholder="https://idp.example.com/.well-known/openid-configuration"
              disabled={isReadOnly}
            />
          </FieldContent>
          <FieldError>{errors.config_url}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="client_id">{t("Client ID")}</FieldLabel>
          <FieldContent>
            <Input
              id="client_id"
              value={values.client_id}
              onChange={(event) => onChange("client_id", event.target.value)}
              placeholder={t("Client ID")}
              disabled={isReadOnly}
            />
          </FieldContent>
          <FieldError>{errors.client_id}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="client_secret">{t("Client Secret")}</FieldLabel>
          <FieldContent>
            <Input
              id="client_secret"
              type="password"
              value={values.client_secret}
              onChange={(event) => onChange("client_secret", event.target.value)}
              placeholder={isCreateMode ? t("Client Secret") : t("Leave empty to keep current secret")}
              disabled={isReadOnly}
            />
          </FieldContent>
          <FieldDescription>
            {isCreateMode
              ? t("Client secret is required when creating a provider.")
              : secretConfigured
                ? t("Secret Configured")
                : t("No Secret Configured")}
          </FieldDescription>
          {!isCreateMode ? <FieldDescription>{t("Leave empty to keep current secret")}</FieldDescription> : null}
          <FieldError>{errors.client_secret}</FieldError>
        </Field>

        <Field className="md:col-span-2">
          <FieldLabel htmlFor="scopes">{t("Scopes")}</FieldLabel>
          <FieldContent>
            <Input
              id="scopes"
              value={values.scopes}
              onChange={(event) => onChange("scopes", event.target.value)}
              placeholder="openid,profile,email"
              disabled={isReadOnly}
            />
          </FieldContent>
          <FieldDescription>{t("Use comma-separated scopes. The openid scope is required.")}</FieldDescription>
          <FieldError>{errors.scopes}</FieldError>
        </Field>

        <Field orientation="responsive" className="items-start gap-3 rounded-md border p-3">
          <FieldLabel htmlFor="redirect_uri_dynamic">{t("Use Dynamic Redirect URI")}</FieldLabel>
          <FieldContent className="gap-2">
            <div className="flex items-center gap-3">
              <Switch
                id="redirect_uri_dynamic"
                checked={values.redirect_uri_dynamic}
                onCheckedChange={(checked) => onChange("redirect_uri_dynamic", checked)}
                disabled={isReadOnly}
              />
              <span className="text-xs text-muted-foreground">
                {values.redirect_uri_dynamic ? t("Enabled") : t("Disabled")}
              </span>
            </div>
            <FieldDescription>
              {values.redirect_uri_dynamic
                ? t("Redirect URI will be resolved dynamically at runtime.")
                : t("Provide an absolute callback URL when dynamic redirect is disabled.")}
            </FieldDescription>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="redirect_uri">{t("Redirect URI")}</FieldLabel>
          <FieldContent>
            <Input
              id="redirect_uri"
              value={values.redirect_uri}
              onChange={(event) => onChange("redirect_uri", event.target.value)}
              placeholder="https://rustfs.example.com/rustfs/admin/v3/oidc/callback/default"
              disabled={isReadOnly || !showRedirectUri}
            />
          </FieldContent>
          <FieldDescription>
            {showRedirectUri
              ? t("Must be an absolute callback URL.")
              : t("Dynamic redirect URI is enabled, so this field is optional.")}
          </FieldDescription>
          <FieldError>{errors.redirect_uri}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="claim_name">{t("Claim Name")}</FieldLabel>
          <FieldContent>
            <Input
              id="claim_name"
              value={values.claim_name}
              onChange={(event) => onChange("claim_name", event.target.value)}
              placeholder={t("Claim Name")}
              disabled={isReadOnly}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="claim_prefix">{t("Claim Prefix")}</FieldLabel>
          <FieldContent>
            <Input
              id="claim_prefix"
              value={values.claim_prefix}
              onChange={(event) => onChange("claim_prefix", event.target.value)}
              placeholder={t("Claim Prefix")}
              disabled={isReadOnly}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="role_policy">{t("Role Policy")}</FieldLabel>
          <FieldContent>
            <Input
              id="role_policy"
              value={values.role_policy}
              onChange={(event) => onChange("role_policy", event.target.value)}
              placeholder={t("Role Policy")}
              disabled={isReadOnly}
            />
          </FieldContent>
          <FieldDescription>
            {t("Optional. Leave empty to let the backend apply its default role mapping.")}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="groups_claim">{t("Groups Claim")}</FieldLabel>
          <FieldContent>
            <Input
              id="groups_claim"
              value={values.groups_claim}
              onChange={(event) => onChange("groups_claim", event.target.value)}
              placeholder={t("Groups Claim")}
              disabled={isReadOnly}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="email_claim">{t("Email Claim")}</FieldLabel>
          <FieldContent>
            <Input
              id="email_claim"
              value={values.email_claim}
              onChange={(event) => onChange("email_claim", event.target.value)}
              placeholder={t("Email Claim")}
              disabled={isReadOnly}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="username_claim">{t("Username Claim")}</FieldLabel>
          <FieldContent>
            <Input
              id="username_claim"
              value={values.username_claim}
              onChange={(event) => onChange("username_claim", event.target.value)}
              placeholder={t("Username Claim")}
              disabled={isReadOnly}
            />
          </FieldContent>
        </Field>
      </div>
    </div>
  )
}
