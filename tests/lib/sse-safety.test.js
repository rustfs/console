import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("app/(dashboard)/sse/page.tsx", "utf8")

test("SSE status and key reads fail closed with persistent recovery states", () => {
  assert.match(source, /statusError/)
  assert.match(source, /setStatusError\(description\)/)
  assert.match(source, /keysError/)
  assert.match(source, /Failed to fetch KMS keys/)
  assert.match(source, /keyDetailsError/)
  assert.match(source, /statusRequestRef/)
  assert.match(source, /keysRequestRef/)
  assert.match(source, /const keysSynced = await loadKeys\(currentMarker, false\)/)
  assert.match(source, /if \(!keysSynced\)/)
  assert.match(source, /keys\.length > 0 && !keysError/)
  assert.match(source, /statusError \|\| keysError \|\| loadingKeys \|\| loadingStatus/)
  assert.match(
    source,
    /disabled=\{Boolean\(activeMutation\) \|\| loadingKeys \|\| loadingStatus \|\| Boolean\(keysError\)\}/,
  )
})

test("SSE mutations use one synchronous lock and block unresolved configuration writes", () => {
  assert.match(source, /mutationRef = React\.useRef<string \| null>\(null\)/)
  assert.match(source, /beginMutation/)
  assert.match(source, /if \(statusError \|\| loadingStatus\)/)
  assert.match(source, /const mutationLocked = Boolean\(activeMutation \|\| statusError \|\| loadingStatus\)/)
  assert.match(source, /const formDisabled = mutationLocked \|\| loadingStatus \|\| submittingConfig/)
  assert.match(source, /disabled=\{formDisabled\}/)
})

test("default key protection rechecks current status before destructive actions", () => {
  assert.match(source, /const latestStatus = await loadStatus\(false\)/)
  assert.match(
    source,
    /!latestStatus\?\.config_summary\s*\|\|\s*latestStatus\.config_summary\.default_key_id === pendingKeyAction\.key\.key_id/,
  )
  assert.match(source, /Cannot delete the default SSE key\. Choose another default key first\./)
  assert.match(source, /isPendingDefaultKey/)
})

test("default-key creation uses a safe status baseline and clears secrets after status sync", () => {
  assert.match(source, /submitConfiguration\(createdKeyId, "defaultKey", buildFormStateFromStatus\(status\)\)/)
  assert.match(source, /const nextFormState = buildFormStateFromStatus\(res\)/)
  assert.match(source, /setFormState\(nextFormState\)/)
  assert.match(source, /setFormState\(\(current\) => \(\{ \.\.\.current, vaultToken: "" \}\)\)/)
  assert.doesNotMatch(source, /if \(current\.vaultToken && next\.backendType !== "local"\)/)
})

test("Local KMS cannot be reconfigured until the backend supports safe secret rotation", () => {
  assert.match(source, /backendType: "vault-transit"/)
  assert.match(source, /const localKmsReadOnly = hasConfiguration && formState\.backendType === "local"/)
  assert.match(
    source,
    /Local filesystem KMS configuration is read-only in Console until safe master-key rotation is available\./,
  )
  assert.match(source, /<SelectItem value="local" disabled>/)
  assert.doesNotMatch(source, /master_key: values\./)
  assert.doesNotMatch(source, /id="localMasterKey"/)
})

test("SSE form and dialogs stay reachable on narrow screens", () => {
  assert.match(source, /<form\s+className="space-y-6"\s+noValidate/)
  assert.match(source, /<fieldset className="space-y-4 border-t pt-4">/)
  assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
  assert.match(source, /md:hidden/)
  assert.match(source, /Schedule Deletion/)
  assert.match(source, /Cancel Deletion/)
  assert.match(source, /required\n\s+aria-required="true"/)
  assert.match(source, /aria-invalid=\{configFormErrorField === "keyDir"\}/)
  assert.match(source, /role="alert"/)
})

test("SSE advanced settings use progressive disclosure and reopen for relevant errors", () => {
  assert.match(source, /ADVANCED_CONFIG_FIELDS/)
  assert.match(source, /advancedSettingsRef = React\.useRef<HTMLDetailsElement>\(null\)/)
  assert.match(source, /advancedSettingsRef\.current\?\.setAttribute\("open", ""\)/)
  assert.match(source, /<details ref=\{advancedSettingsRef\}/)
  assert.match(source, /<details ref=\{advancedSettingsRef\} className="space-y-4 border-t pt-4">/)
  assert.doesNotMatch(source, /<fieldset className="space-y-4 border p-4">/)
  assert.match(source, /\{t\("Advanced Settings"\)\}/)
  assert.match(source, /id="timeoutSeconds"/)
  assert.match(source, /id="maxCachedKeys"/)
})

test("SSE detail surfaces use semantic rows instead of nested bordered cards", () => {
  assert.match(source, /<dl className="grid gap-x-6 sm:grid-cols-2">/)
  assert.match(source, /<dt className="text-xs text-muted-foreground">/)
  assert.match(source, /<dd className="break-all text-sm font-medium">/)
  assert.doesNotMatch(source, /<div className="border p-3">/)
})

test("SSE confirmations name the risk and cannot close while an action is processing", () => {
  assert.match(source, /pendingServiceAction/)
  assert.match(source, /Changing KMS service state may briefly interrupt SSE requests\./)
  assert.match(source, /disablePointerDismissal=\{creatingKey\}/)
  assert.match(source, /if \(!open && creatingKey\) return/)
  assert.match(source, /if \(!open && !processingKeyAction\) setPendingKeyAction\(null\)/)
  assert.match(source, /pendingKeyAction\?\.type === "forceDelete"\n\s+\? t\("Delete Key Immediately"\)/)
  assert.match(source, /bg-destructive text-destructive-foreground/)
  assert.match(source, /KMS will be stopped\. SSE and key management will be unavailable until you start KMS again\./)
  assert.match(source, /pendingServiceAction === "stop" \? t\("Stop KMS"\) : t\("Confirm"\)/)
})

test("KMS configuration keeps an explicit baseline and intercepts accidental navigation", () => {
  assert.match(source, /baselineFormState/)
  assert.match(source, /const isConfigDirty = React\.useMemo/)
  assert.match(source, /window\.addEventListener\("beforeunload", handleBeforeUnload\)/)
  assert.match(source, /window\.addEventListener\("popstate", handlePopState\)/)
  assert.match(source, /allowNavigationRef\.current = true/)
  assert.match(source, /document\.addEventListener\("click", handleDocumentNavigation, true\)/)
  assert.match(source, /pendingNavigation/)
  assert.match(source, /setPendingKeyAction\(null\)\s*await reconcileMutationState\(true\)/)
})
