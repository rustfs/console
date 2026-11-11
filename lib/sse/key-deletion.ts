export interface KmsImmediateKeyDeletionRequest {
  key_id: string
  force_immediate: true
  confirm_key_id: string
}

// A key is destroyed in two steps: only one already scheduled for deletion can be deleted immediately.
export function isKeyPendingDeletion(status?: string | null): boolean {
  return (status ?? "").toLowerCase().includes("pendingdeletion")
}

export function isImmediateKeyDeletionConfirmed(keyId: string, typedKeyId: string): boolean {
  return keyId.length > 0 && typedKeyId === keyId
}

// The server only accepts immediate deletion as a JSON body that repeats the key ID.
export function buildImmediateKeyDeletionRequest(keyId: string, confirmKeyId: string): KmsImmediateKeyDeletionRequest {
  return { key_id: keyId, force_immediate: true, confirm_key_id: confirmKeyId }
}
