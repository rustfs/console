import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { CopyObjectCommand, type S3Client } from "@aws-sdk/client-s3"
import ts from "typescript"
import { capabilityCheckGroups } from "../../lib/permission-capabilities"
import { encodeObjectCopySource } from "../../lib/object-rename"
import type { useObject as ObjectHook } from "../../hooks/use-object"

const clientKey = Symbol.for("object-copy-permissions-client")
const source = ts.transpileModule(readFileSync(new URL("../../hooks/use-object.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText
const moduleSource = source.replace(/from "([^"]+)"/g, (_statement, specifier: string) => {
  let target: string
  if (specifier === "react")
    target = `data:text/javascript,${encodeURIComponent("export const useCallback = callback => callback")}`
  else if (specifier === "@/contexts/s3-context")
    target = `data:text/javascript,${encodeURIComponent('export const useS3 = () => globalThis[Symbol.for("object-copy-permissions-client")]')}`
  else if (specifier.startsWith("@/lib/")) target = new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href
  else target = import.meta.resolve(specifier)
  return `from "${target}"`
})
const { useObject } = (await import(`data:text/javascript,${encodeURIComponent(moduleSource)}`)) as {
  useObject: typeof ObjectHook
}

for (const mode of ["rename", "restore"] as const) {
  test(`${mode} copy permission facts match the actual SDK request including absent conditional headers`, async (t) => {
    const commands: unknown[] = []
    Reflect.set(globalThis, clientKey, {
      send: async (command: unknown) => {
        commands.push(command)
        return {}
      },
    } as unknown as S3Client)
    t.after(() => Reflect.deleteProperty(globalThis, clientKey))
    const bucket = "alice-data"
    const objectKey = "源 文件%+/data.txt"
    const targetObjectKey = "/target.txt"
    const versionId = "00000000-0000-0000-0000-000000000000"
    const api = useObject(bucket)
    if (mode === "rename") await api.renameObject(objectKey, targetObjectKey)
    else await api.restoreObjectVersion(objectKey, versionId)
    const copy = commands.find((command) => command instanceof CopyObjectCommand)
    assert.ok(copy instanceof CopyObjectCommand)
    const check = capabilityCheckGroups(mode === "rename" ? "objects.rename" : "objects.version.restore", {
      bucket,
      objectKey,
      targetObjectKey,
      versionId,
    })
      .flatMap((group) => group.checks)
      .find((check) => check.action === "s3:PutObject")!
    const context = check.context!
    assert.equal(context.bucket, copy.input.Bucket)
    assert.equal(context.objectKey, copy.input.Key)
    assert.equal(context.authType, "REST-HEADER")
    assert.equal(context.operation, copy.constructor.name.replace(/Command$/, ""))
    assert.equal(context.ifMatch, copy.input.IfMatch ?? null)
    assert.equal(context.ifNoneMatch, copy.input.IfNoneMatch ?? null)
    assert.ok(context.copySource)
    assert.equal(
      encodeObjectCopySource(context.copySource.bucket, context.copySource.objectKey, context.copySource.versionId),
      copy.input.CopySource,
    )
    assert.equal(Object.hasOwn(context, "requestTags"), false)
    assert.equal(copy.input.TaggingDirective, "COPY")
    assert.equal(context.ifNoneMatch, mode === "rename" ? "*" : null)
  })
}
