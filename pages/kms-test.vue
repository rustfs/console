<template>
  <page>
    <page-header>
      <h1 class="text-2xl font-bold">KMS API Test Page</h1>
      <template #description>
        <p class="text-gray-600 dark:text-gray-400">Test page for KMS functionality after API updates</p>
      </template>
    </page-header>

    <div>
      <Card class="mb-6 shadow-none">
        <CardHeader>
          <CardTitle>KMS API Test Suite</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Button @click="testServiceStatus" :loading="testing.status">Test Service Status</Button>
            <Button @click="testConfiguration" :loading="testing.config">Test Configuration</Button>
            <Button @click="testKeyList" :loading="testing.keys">Test Key List</Button>
            <Button @click="testClearCache" :loading="testing.cache">Test Clear Cache</Button>
          </div>

          <Card v-if="testResults.length > 0" class="shadow-none">
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2">
              <div
                v-for="(result, index) in testResults"
                :key="index"
                class="rounded border-l-4 p-3"
                :class="result.success ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-rose-500 bg-rose-50 dark:bg-rose-900/10'"
              >
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 class="font-medium">{{ result.test }}</h4>
                    <p class="text-sm text-muted-foreground">{{ result.message }}</p>
                    <div v-if="result.data" class="mt-2 text-sm text-muted-foreground">
                      <details>
                        <summary class="cursor-pointer text-sm text-primary">View Response Data</summary>
                        <pre class="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-xs">{{ JSON.stringify(result.data, null, 2) }}</pre>
                      </details>
                    </div>
                  </div>
                  <Badge :variant="result.success ? 'secondary' : 'destructive'" class="self-start">
                    {{ result.success ? 'PASS' : 'FAIL' }}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card class="shadow-none">
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">
                Updated KMS API documentation is available in the project's docs folder.
              </p>
              <Button
                as="a"
                href="/docs/kms/frontend-api-guide-zh.md"
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                class="mt-2 w-fit"
              >
                View API Documentation
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  </page>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMessage } from '@/composables/ui'
import { reactive, ref } from 'vue'

const { getKMSStatus, getConfiguration, getKeyList, clearCache } = useSSE()
const message = useMessage()

const testing = reactive({
  status: false,
  config: false,
  keys: false,
  cache: false,
})

const testResults = ref<Array<{ test: string; success: boolean; message: string; data?: any; timestamp: Date }>>([])

const addTestResult = (test: string, success: boolean, message: string, data?: any) => {
  testResults.value.unshift({ test, success, message, data, timestamp: new Date() })
  if (testResults.value.length > 10) {
    testResults.value = testResults.value.slice(0, 10)
  }
}

const testServiceStatus = async () => {
  testing.status = true
  try {
    const result = await getKMSStatus()
    addTestResult('Service Status', true, `Service status: ${result.status}, Healthy: ${result.healthy}`, result)
    message.success('Service status test passed')
  } catch (error) {
    addTestResult('Service Status', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, error)
    message.error('Service status test failed')
  } finally {
    testing.status = false
  }
}

const testConfiguration = async () => {
  testing.config = true
  try {
    const result = await getConfiguration()
    addTestResult('Configuration', true, `Configuration loaded with backend: ${result.backend}`, result)
    message.success('Configuration test passed')
  } catch (error) {
    addTestResult('Configuration', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, error)
    message.error('Configuration test failed')
  } finally {
    testing.config = false
  }
}

const testKeyList = async () => {
  testing.keys = true
  try {
    const result = await getKeyList()
    const keyCount = result.keys ? result.keys.length : 0
    addTestResult('Key List', true, `Found ${keyCount} keys, Truncated: ${result.truncated || false}`, result)
    message.success('Key list test passed')
  } catch (error) {
    addTestResult('Key List', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, error)
    message.error('Key list test failed')
  } finally {
    testing.keys = false
  }
}

const testClearCache = async () => {
  testing.cache = true
  try {
    const result = await clearCache()
    addTestResult(
      'Clear Cache',
      result.status === 'success',
      `Cache clear result: ${result.status} - ${result.message}`,
      result,
    )
    message.success('Clear cache test completed')
  } catch (error) {
    addTestResult('Clear Cache', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, error)
    message.error('Clear cache test failed')
  } finally {
    testing.cache = false
  }
}
</script>
