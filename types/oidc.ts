export type OidcConfigSource = "env" | "persisted"

export interface OidcConfigProvider {
  provider_id: string
  source: OidcConfigSource
  editable: boolean
  enabled: boolean
  display_name: string
  config_url: string
  client_id: string
  client_secret_configured: boolean
  scopes: string[]
  redirect_uri: string
  redirect_uri_dynamic: boolean
  claim_name: string
  claim_prefix: string
  role_policy: string
  groups_claim: string
  /** Secondary claim for role values (e.g. Entra `roles`). Omitted by older servers. */
  roles_claim?: string
  email_claim: string
  username_claim: string
}

export interface OidcConfigResponse {
  providers: OidcConfigProvider[]
  restart_required: boolean
}

export interface SaveOidcConfigPayload {
  enabled: boolean
  display_name: string
  config_url: string
  client_id: string
  client_secret?: string
  scopes: string[]
  redirect_uri: string
  redirect_uri_dynamic: boolean
  claim_name: string
  claim_prefix: string
  role_policy: string
  groups_claim: string
  roles_claim: string
  email_claim: string
  username_claim: string
}

export interface DeleteOidcConfigResponse {
  success: boolean
  message: string
  restart_required: boolean
}

export interface SaveOidcConfigResponse {
  success: boolean
  message: string
  restart_required: boolean
}

export interface ValidateOidcConfigPayload {
  provider_id: string
  config_url: string
  client_id: string
  client_secret: string
  scopes: string[]
  redirect_uri: string
  redirect_uri_dynamic: boolean
}

export interface ValidateOidcConfigResponse {
  valid: boolean
  message: string
  issuer?: string
  authorization_endpoint?: string
  token_endpoint?: string
}

export interface OidcProviderFormValues {
  provider_id: string
  enabled: boolean
  display_name: string
  config_url: string
  client_id: string
  client_secret: string
  scopes: string
  redirect_uri: string
  redirect_uri_dynamic: boolean
  claim_name: string
  claim_prefix: string
  role_policy: string
  groups_claim: string
  roles_claim: string
  email_claim: string
  username_claim: string
}

export type OidcProviderFormErrors = Partial<Record<keyof OidcProviderFormValues, string>>

export const DEFAULT_OIDC_FORM_VALUES: OidcProviderFormValues = {
  provider_id: "",
  enabled: true,
  display_name: "",
  config_url: "",
  client_id: "",
  client_secret: "",
  scopes: "openid,profile,email",
  redirect_uri: "",
  redirect_uri_dynamic: false,
  claim_name: "groups",
  claim_prefix: "",
  role_policy: "",
  groups_claim: "groups",
  roles_claim: "",
  email_claim: "email",
  username_claim: "preferred_username",
}
