import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const read = (file) => fs.readFileSync(file, "utf8")

test("new user dialog distinguishes assignment loading errors and keeps actions fixed", () => {
  const source = read("components/user/new-form.tsx")

  assert.match(source, /const \[loading, setLoading\] = React\.useState\(false\)/)
  assert.match(source, /const \[loadError, setLoadError\] = React\.useState\(""\)/)
  assert.match(source, /let cancelled = false/)
  assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
  assert.match(source, /<form\s+className="contents"\s+onSubmit=/)
  assert.match(source, /min-h-0[^"]*overflow-y-auto overscroll-contain/)
  assert.match(source, /className="min-h-10 w-full min-w-0 justify-between gap-2"/)
  assert.match(source, /<FieldError id="new-user-access-key-error">/)
  assert.doesNotMatch(source, /max-h-\[80vh\]/)
})

test("change password proves knowledge of the current secret before rotating it", () => {
  const source = read("components/account/change-password-dialog.tsx")

  // The request is already signed, but the console signs with a short-lived
  // session: a signature proves the session is live, not that the person at the
  // keyboard knows the password. Dropping this field would let a borrowed tab
  // change the account's credentials.
  assert.match(source, /changePassword\(current, next\)/)
  assert.match(source, /autoComplete="current-password"/)
  assert.match(source, /PASSWORD_MIN_LENGTH = 8/)
  assert.match(source, /<form\s+className="contents"\s+onSubmit=/)
  assert.match(source, /type="submit"/)

  // Failures stay next to the form and preserve what was typed.
  assert.match(source, /aria-describedby=\{errors\.current \? "account-password-current-error" : undefined\}/)
  assert.match(source, /setSubmitError/)

  // The old flow re-POSTed the whole user through add-user, which rewrote
  // status and dropped the policy field. It must not come back.
  assert.doesNotMatch(source, /add-user/)
  assert.doesNotMatch(source, /createUser/)
})

test("the self-service password endpoint sends both secrets and nothing else", () => {
  const source = read("hooks/use-account.ts")

  assert.match(source, /"\/account\/password"/)
  assert.match(source, /current_secret_key: currentSecretKey, new_secret_key: newSecretKey/)
  // Self-service only: no target parameter, so this cannot act on another
  // identity even if a caller tried.
  assert.doesNotMatch(source, /accessKey=\$\{/)
})

test("credential result prevents accidental dismissal and names copy actions", () => {
  const notice = read("components/user/notice.tsx")
  const copyInput = read("components/copy-input.tsx")

  assert.match(notice, /showCloseButton=\{false\}/)
  assert.match(notice, /The secret key is shown only once\. Copy or export it before closing\./)
  assert.match(notice, /copyLabel=\{`\$\{t\("Copy"\)\} \$\{t\("Access Key"\)\}`\}/)
  assert.match(notice, /t\("Close"\)/)
  assert.match(notice, /t\("Download"\)/)
  assert.match(copyInput, /copyLabel\?: string/)
  assert.match(copyInput, /const resolvedCopyLabel = copyLabel \?\? t\("Copy"\)/)
})

test("batch policy dialog loads safely and cannot submit an empty selection", () => {
  const source = read("components/user-group/set-policies-multiple.tsx")

  assert.match(source, /const \[loading, setLoading\] = React\.useState\(false\)/)
  assert.match(source, /const \[loadError, setLoadError\] = React\.useState\(""\)/)
  assert.match(source, /let cancelled = false/)
  assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
  assert.match(source, /<form\s+className="contents"\s+onSubmit=/)
  assert.match(
    source,
    /disabled=\{!checked\.length \|\| !checkedKeys\.length \|\| loading \|\| Boolean\(loadError\) \|\| submitting\}/,
  )
  assert.match(source, /<DialogFooter className="border-t bg-muted\/20 px-4 py-3">/)
})
