<template>
  <div>
    <page-header>
      <template #title>
        <h1 class="text-2xl font-bold">KMS API Test Page</h1>
      </template>
      <template #description>
        <p class="text-gray-600 dark:text-gray-400">Test page for KMS functionality after API updates</p>
      </template>
    </page-header>

    <page-content>
      <n-card title="KMS API Test Suite" class="mb-6">
        <div class="space-y-4">
          <!-- Test Buttons -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <n-button @click="testServiceStatus" :loading="testing.status"> Test Service Status </n-button>
            <n-button @click="testConfiguration" :loading="testing.config"> Test Configuration </n-button>
            <n-button @click="testKeyList" :loading="testing.keys"> Test Key List </n-button>
            <n-button @click="testClearCache" :loading="testing.cache"> Test Clear Cache </n-button>
          </div>

          <!-- Test Results -->
          <n-card title="Test Results" v-if="testResults.length > 0">
            <div class="space-y-2">
              <div
                v-for="(result, index) in testResults"
                :key="index"
                class="border-l-4 p-3 rounded"
                :class="{
                  'border-green-500 bg-green-50': result.success,
                  'border-red-500 bg-red-50': !result.success,
                }"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-medium">{{ result.test }}</h4>
                    <p class="text-sm text-gray-600">{{ result.message }}</p>
                    <div v-if="result.data" class="mt-2">
                      <details>
                        <summary class="cursor-pointer text-sm text-blue-600">View Response Data</summary>
                        <pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">{{
                          JSON.stringify(result.data, null, 2)
                        }}</pre>
                      </details>
                    </div>
                  </div>
                  <n-tag :type="result.success ? 'success' : 'error'" size="small">
                    {{ result.success ? 'PASS' : 'FAIL' }}
                  </n-tag>
                </div>
              </div>
            </div>
          </n-card>

          <!-- API Documentation Link -->
          <n-card title="API Documentation">
            <p>Updated KMS API documentation is available in the project's docs folder.</p>
            <n-button tag="a" href="/docs/kms/frontend-api-guide-zh.md" target="_blank" class="mt-2">
              View API Documentation
            </n-button>
          </n-card>
        </div>
      </n-card>
    </page-content>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useMessage } from 'naive-ui';

const { getKMSStatus, getConfiguration, getKeyList, clearCache, validateConfiguration } = useSSE();
const message = useMessage();

// Test states
const testing = reactive({
  status: false,
  config: false,
  keys: false,
  cache: false,
});

const testResults = ref<
  Array<{
    test: string;
    success: boolean;
    message: string;
    data?: any;
    timestamp: Date;
  }>
>([]);

const addTestResult = (test: string, success: boolean, message: string, data?: any) => {
  testResults.value.unshift({
    test,
    success,
    message,
    data,
    timestamp: new Date(),
  });

  // Keep only last 10 results
  if (testResults.value.length > 10) {
    testResults.value = testResults.value.slice(0, 10);
  }
};

const testServiceStatus = async () => {
  testing.status = true;
  try {
    const result = await getKMSStatus();
    addTestResult('Service Status', true, `Service status: ${result.status}, Healthy: ${result.healthy}`, result);
    message.success('Service status test passed');
  } catch (error) {
    addTestResult('Service Status', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    message.error('Service status test failed');
  } finally {
    testing.status = false;
  }
};

const testConfiguration = async () => {
  testing.config = true;
  try {
    const result = await getConfiguration();
    addTestResult('Configuration', true, `Configuration loaded with backend: ${result.backend}`, result);
    message.success('Configuration test passed');
  } catch (error) {
    addTestResult('Configuration', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    message.error('Configuration test failed');
  } finally {
    testing.config = false;
  }
};

const testKeyList = async () => {
  testing.keys = true;
  try {
    const result = await getKeyList();
    const keyCount = result.keys ? result.keys.length : 0;
    addTestResult('Key List', true, `Found ${keyCount} keys, Truncated: ${result.truncated || false}`, result);
    message.success('Key list test passed');
  } catch (error) {
    addTestResult('Key List', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    message.error('Key list test failed');
  } finally {
    testing.keys = false;
  }
};

const testClearCache = async () => {
  testing.cache = true;
  try {
    const result = await clearCache();
    addTestResult(
      'Clear Cache',
      result.status === 'success',
      `Cache clear result: ${result.status} - ${result.message}`,
      result
    );
    message.success('Clear cache test completed');
  } catch (error) {
    addTestResult('Clear Cache', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    message.error('Clear cache test failed');
  } finally {
    testing.cache = false;
  }
};
</script>
