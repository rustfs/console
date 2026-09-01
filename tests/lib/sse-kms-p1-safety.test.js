import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const pageSource = fs.readFileSync("app/(dashboard)/sse/page.tsx", "utf8")
const rekeyCardSource = fs.readFileSync("components/sse/rekey-card.tsx", "utf8")

test("blank Vault TLS paths never reach the configure payload (old servers reject unknown fields)", () => {
  assert.match(pageSource, /\.\.\.\(caCertPath \? \{ ca_cert_path: caCertPath \} : \{\}\)/)
  assert.match(
    pageSource,
    /\.\.\.\(clientCertPath \? \{ client_cert_path: clientCertPath, client_key_path: clientKeyPath \} : \{\}\)/,
  )
})

test("mTLS client certificate and key are validated as a pair before submit", () => {
  assert.match(pageSource, /Boolean\(clientCertPath\) !== Boolean\(clientKeyPath\)/)
  assert.match(pageSource, /field: clientCertPath \? "clientKeyPath" : "clientCertPath"/)
})

test("the non-production badge renders only on an explicit false, never on a missing capability", () => {
  assert.match(pageSource, /capabilities\?\.production_supported === false/)
  assert.doesNotMatch(pageSource, /!capabilities\?\.production_supported/)
})

test("rekey UI is gated on a served capability matrix so old servers never see it", () => {
  assert.match(
    pageSource,
    /\{isRunning && capabilities \? <RekeyCard rewrapSupported=\{capabilities\.rewrap === true\} \/> : null\}/,
  )
})

test("rekey card distinguishes the never-ran empty state and surfaces 409/501 responses distinctly", () => {
  assert.match(rekeyCardSource, /isRekeyNeverRanError\(error\)/)
  assert.match(rekeyCardSource, /isRekeyAlreadyRunningError\(error\)/)
  assert.match(rekeyCardSource, /isRekeyUnsupportedError\(error\)/)
  assert.match(rekeyCardSource, /No rekey sweep has run yet/)
})

test("failed rewraps point the operator at the idempotent re-run recovery", () => {
  assert.match(rekeyCardSource, /snapshot\.failed > 0/)
  assert.match(rekeyCardSource, /run it again to retry only the failed versions/)
})

test("polling runs only while a sweep is running and stops on terminal states", () => {
  assert.match(rekeyCardSource, /const isSweepRunning = snapshot\?\.state === "running"/)
  assert.match(rekeyCardSource, /if \(!isSweepRunning\) return/)
  assert.match(rekeyCardSource, /clearInterval\(intervalId\)/)
})
