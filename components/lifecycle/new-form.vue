<template>
  <n-modal v-model:show="visible" :mask-closable="false" preset="card" :title="t('Add Lifecycle Rule') + ` (${t('Bucket')}: ${bucketName})`" class="max-w-screen-md" :segmented="{
    content: true,
    action: true,
  }">
    <n-card>
      <n-tabs default-value="expire" justify-content="space-evenly" type="line">
        <n-tab-pane name="expire" :tab="t('Expiration')">
          <n-form class="my-4" ref="formRef" :model="formData">
            <n-form-item :label="t('Object Version')" path="versionType">
              <n-select v-model:value="formData.versionType" :options="versionOptions" />
            </n-form-item>
            <n-form-item label="" path="type">
              <div class="w-full flex items-center justify-between">
                <span>{{ t('After') }}</span>
                <n-input-number class="flex-auto mx-4" v-model:value="formData.days" :min="1" :placeholder="t('Days')" style="width: 100px" />
                <span>{{ t('days execute') }}</span>
                <!-- <n-select
                class="flex-auto mx-4"
                v-model:value="formData.action"
                :options="actionOptions"
                style="width: 120px"
              /> -->
              </div>
            </n-form-item>

            <!-- 生命周期 -->
            <n-card>
              <n-collapse>
                <n-collapse-item :title="t('Search Lifecycle')" name="advanced">
                  <n-form-item :label="t('Prefix')">
                    <n-input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
                  </n-form-item>
                  <n-form-item :label="t('Tags')">
                    <n-dynamic-input v-model:value="formData.tags" preset="pair" :key-placeholder="t('Tag Name')" :value-placeholder="t('Tag Value')" />
                  </n-form-item>
                </n-collapse-item>
              </n-collapse>
            </n-card>

            <!-- 高级设置 -->
            <n-card class="my-4">
              <n-collapse>
                <n-collapse-item :title="t('Advanced Settings')" name="advanced">
                  <n-form-item :label="t('Delete Marker Handling')">
                    <n-space vertical>
                      <n-switch v-model:value="formData.expiredDeleteMark" :round="false" />
                      <span class="ml-4 text-gray-500">{{ t('If no versions remain, delete references to this object') }}</span>
                    </n-space>
                  </n-form-item>

                  <n-form-item :label="t('Version Cleanup')">
                    <n-space vertical>
                      <n-switch v-model:value="formData.deleteAllExpired" :round="false" />
                      <span class="ml-4 text-gray-500">{{ t('Delete all expired versions') }}</span>
                    </n-space>
                  </n-form-item>
                </n-collapse-item>
              </n-collapse>
            </n-card>
          </n-form>
        </n-tab-pane>
        <n-tab-pane name="transition" :tab="t('Transition')">
          <n-form class="my-4" ref="formRef" :model="formData">
            <n-form-item :label="t('Object Version')" path="versionType">
              <n-select v-model:value="formData.versionType" :options="versionOptions" />
            </n-form-item>
            <n-form-item label="" path="type">
              <div class="w-full flex items-center justify-between">
                <span>{{ t('After') }}</span>
                <n-input-number class="flex-auto mx-4" v-model:value="formData.days" :min="1" :placeholder="t('Days')" style="width: 100px" />
                <span>{{ t('days execute') }}</span>
                <n-select class="flex-auto mx-4" v-model:value="formData.action" :options="actionOptions" style="width: 120px" />
              </div>
            </n-form-item>

            <!-- 生命周期 -->
            <n-card>
              <n-collapse>
                <n-collapse-item :title="t('Search Lifecycle')" name="advanced">
                  <n-form-item :label="t('Prefix')">
                    <n-input v-model="formData.prefix" :placeholder="t('Please enter prefix')" />
                  </n-form-item>
                  <n-form-item :label="t('Tags')">
                    <n-dynamic-input v-model:value="formData.tags" preset="pair" :key-placeholder="t('Tag Name')" :value-placeholder="t('Tag Value')" />
                  </n-form-item>
                </n-collapse-item>
              </n-collapse>
            </n-card>


            <!-- 高级设置 -->
            <n-card class="my-4">
              <n-collapse>
                <n-collapse-item :title="t('Advanced Settings')" name="advanced">
                  <n-form-item :label="t('Delete Marker Handling')">
                    <n-space vertical>
                      <n-switch v-model:value="formData.expiredDeleteMark" :round="false" />
                      <span class="ml-4 text-gray-500">{{ t('If no versions remain, delete references to this object') }}</span>
                    </n-space>
                  </n-form-item>

                  <n-form-item :label="t('Version Cleanup')">
                    <n-space vertical>
                      <n-switch v-model:value="formData.deleteAllExpired" :round="false" />
                      <span class="ml-4 text-gray-500">{{ t('Delete all expired versions') }}</span>
                    </n-space>
                  </n-form-item>
                </n-collapse-item>
              </n-collapse>
            </n-card>
          </n-form>
        </n-tab-pane>
      </n-tabs>


      <n-space justify="center">
        <n-button @click="handleCancel">{{ t('Cancel') }}</n-button>
        <n-button type="primary" @click="handleSave">{{ t('Save') }}</n-button>
      </n-space>
    </n-card>
  </n-modal>
</template>

<script setup>
import {
  NButton,
  NCollapse,
  NCollapseItem,
  NDynamicInput,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSwitch
} from 'naive-ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const formRef = ref(null)
const formData = ref({
  ruleName: '',
  type: null,
  versionType: 'current',
  days: null,
  action: 'transition',
  tags: [{
    key: '',
    value: ''
  }],
  expiredDeleteMark: false,
  deleteAllExpired: false
})


const typeOptions = [
  { label: t('Expiration'), value: 'expire' },
  { label: t('Transition'), value: 'transition' }
]

const versionOptions = [
  { label: t('Current Version'), value: 'current' },
  { label: t('Non-current Version'), value: 'non-current' }
]

const actionOptions = [
  { label: t('Transition'), value: 'transition' },
  { label: t('Delete'), value: 'delete' }
]

const props = defineProps({
  bucketName: {
    type: String,
    required: true
  }
})

const visible = ref(false)
const open = () => {
  visible.value = true
}

defineExpose({
  open
})
const handleSave = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      console.log('提交数据:', formData.value)
      // 调用保存接口
    }
  })
}

const handleCancel = () => {
  // 取消逻辑
  visible.value = false
}
</script>
