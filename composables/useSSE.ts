export const useSSE = () => {
  const { $api } = useNuxtApp();
  return {
    // Service Management APIs

    // Get KMS service status
    async getKMSStatus() {
      return await $api.get('/kms/service-status');
    },

    // Configure KMS service
    async configureKMS(data: any) {
      // Backend expects a tagged union format based on backend_type
      if (data.backend_type === 'vault' || !data.backend_type) {
        // Vault backend configuration
        const vaultRequest: any = {
          backend_type: 'vault',
          address: data.address || data.backend?.address,
          mount_path: data.mount_path || data.backend?.mount_path || 'transit',
          kv_mount: data.kv_mount || data.backend?.kv_mount || 'secret',
          key_path_prefix: data.key_path_prefix || data.backend?.key_path_prefix || 'rustfs/kms/keys',
          default_key_id: data.default_key_id,
          timeout_seconds: data.timeout_seconds || 30,
          retry_attempts: data.retry_attempts || 3,
          enable_cache: data.enable_cache !== undefined ? data.enable_cache : true,
          cache_ttl_seconds: data.cache_ttl_seconds || 600,
        };

        // Handle authentication method (VaultAuthMethod enum)
        if (data.auth_method || data.backend?.auth_method) {
          const authMethod = data.auth_method || data.backend.auth_method;

          // Handle token authentication
          if (authMethod.token) {
            vaultRequest.auth_method = {
              Token: { token: authMethod.token },
            };
          }
          // Handle AppRole authentication
          else if (authMethod.role_id && authMethod.secret_id) {
            vaultRequest.auth_method = {
              AppRole: {
                role_id: authMethod.role_id,
                secret_id: authMethod.secret_id,
              },
            };
          }
        }

        return await $api.post('/kms/configure', vaultRequest);
      } else if (data.backend_type === 'local') {
        // Local backend configuration
        const localRequest = {
          backend_type: 'local',
          key_dir: data.key_directory || data.backend?.key_directory || './kms_keys',
          master_key: data.master_key,
          default_key_id: data.default_key_id,
          timeout_seconds: data.timeout_seconds || 30,
          retry_attempts: data.retry_attempts || 3,
          enable_cache: data.enable_cache !== undefined ? data.enable_cache : true,
          cache_ttl_seconds: data.cache_ttl_seconds || 600,
        };

        return await $api.post('/kms/configure', localRequest);
      } else {
        throw new Error(`Unsupported backend type: ${data.backend_type}`);
      }
    },

    // Start KMS service
    async startKMS() {
      return await $api.post('/kms/start', {});
    },

    // Stop KMS service
    async stopKMS() {
      return await $api.post('/kms/stop', {});
    },

    // Reconfigure KMS service
    async reconfigureKMS(data: any) {
      return await $api.post('/kms/reconfigure', data);
    },

    // Get KMS configuration
    async getConfiguration() {
      return await $api.get('/kms/config');
    },

    // Clear KMS cache
    async clearCache() {
      return await $api.post('/kms/clear-cache', {});
    },

    // Get detailed KMS status (legacy endpoint with cache stats)
    async getDetailedStatus() {
      return await $api.get('/kms/status');
    },

    // Validate KMS configuration
    async validateConfiguration() {
      try {
        const status = await this.getKMSStatus();
        const config = await this.getConfiguration();

        return {
          isValid: status.status === 'Running' && status.healthy === true,
          status: status.status,
          healthy: status.healthy,
          hasConfig: !!config,
          issues: [],
        };
      } catch (error) {
        return {
          isValid: false,
          status: 'Error',
          healthy: false,
          hasConfig: false,
          issues: ['Failed to connect to KMS service'],
        };
      }
    },

    // Key Management APIs

    // Create master key
    async createKey(data: { KeyUsage?: string; Description?: string; Tags?: Record<string, string> }) {
      // Ensure we use the correct parameter format for the new API
      const requestData = {
        key_usage: data.KeyUsage || 'EncryptDecrypt',
        description: data.Description,
        tags: data.Tags,
      };
      return await $api.post('/kms/keys', requestData);
    },

    // Get key details
    async getKeyDetails(keyId: string) {
      return await $api.get(`/kms/keys/${keyId}`);
    },

    // List keys with pagination
    async getKeyList(params?: { limit?: number; marker?: string }) {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.marker) queryParams.append('marker', params.marker);

      const url = queryParams.toString() ? `/kms/keys?${queryParams}` : '/kms/keys';
      return await $api.get(url);
    },

    // Delete key immediately
    async deleteKey(keyId: string) {
      // Use query parameters for DELETE request
      const queryParams = new URLSearchParams();
      queryParams.append('keyId', keyId);
      const url = `/kms/keys/delete?${queryParams.toString()}`;
      return await $api.delete(url);
    },

    // Force delete key (for keys in PendingDeletion status)
    async forceDeleteKey(keyId: string) {
      // Use query parameters for DELETE request with force_immediate=true
      const queryParams = new URLSearchParams();
      queryParams.append('keyId', keyId);
      queryParams.append('force_immediate', 'true');
      const url = `/kms/keys/delete?${queryParams.toString()}`;
      return await $api.delete(url);
    },

    // Cancel key deletion
    async cancelKeyDeletion(keyId: string) {
      return await $api.post('/kms/keys/cancel-deletion', { key_id: keyId });
    },

    // Data Encryption APIs

    // Generate data key
    async generateDataKey(data: { key_id: string; key_spec?: string; encryption_context?: Record<string, string> }) {
      return await $api.post('/kms/generate-data-key', data);
    },

    // Decrypt data key (Note: This is for testing/internal use only)
    // In normal operation, RustFS server handles all encryption/decryption automatically
    async decryptDataKey(data: { ciphertext_blob: string; encryption_context?: Record<string, string> }) {
      // This endpoint is primarily for RustFS server internal use
      // Frontend management console rarely needs to call this directly
      console.warn('decryptDataKey should typically be called by RustFS server, not frontend');
      throw new Error('Decrypt data key endpoint is not implemented yet. This is primarily for server-side use.');
      // return await $api.post('/kms/decrypt', data);
    },

    // Legacy compatibility methods (deprecated)

    // @deprecated Use getKMSStatus instead
    async getStatus() {
      return await this.getKMSStatus();
    },

    // @deprecated Use createKey with new format instead
    async enableKey(keyId: string) {
      console.warn('enableKey is deprecated. Key management should be done through AWS KMS-compatible APIs.');
      // This functionality may need to be implemented differently based on new API design
      throw new Error('Key enable/disable functionality needs to be redesigned for new API');
    },

    // @deprecated Use createKey with new format instead
    async disableKey(keyId: string) {
      console.warn('disableKey is deprecated. Key management should be done through AWS KMS-compatible APIs.');
      // This functionality may need to be implemented differently based on new API design
      throw new Error('Key enable/disable functionality needs to be redesigned for new API');
    },

    // @deprecated Use getKeyDetails instead
    async getKeyStatus(keyId: string) {
      console.warn('getKeyStatus is deprecated. Use getKeyDetails instead.');
      return await this.getKeyDetails(keyId);
    },
  };
};
