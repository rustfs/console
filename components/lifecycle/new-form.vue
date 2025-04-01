<template>
   <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    title="添加生命周期规则"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-card>
  <n-form ref="formRef" :model="formData">
    <!-- 规则类型 -->
    <n-form-item label="类型" path="type">
      <n-select
        v-model:value="formData.type"
        :options="typeOptions"
        placeholder="选择规则类型"
      />
    </n-form-item>
    <n-form-item label="对象版本" path="versionType">
      <n-select
        v-model:value="formData.versionType"
        :options="versionOptions"
      />
    </n-form-item>
    <n-form-item label="" path="type">
      <div class="w-full flex items-center justify-between" >
        <span>在</span>
        <n-input-number
          class="flex-auto mx-4"
          v-model:value="formData.days"
          :min="1"
          placeholder="天数"
          style="width: 100px"
        />
        <span>天后执行</span>
        <n-select
          class="flex-auto mx-4"
          v-model:value="formData.action"
          :options="actionOptions"
          style="width: 120px"
        />
      </div>
    </n-form-item>

    <!-- 生命周期 -->
    <n-card>  
      <n-collapse>
        <n-collapse-item title="搜索生命周期" name="advanced">
            <n-form-item label="前缀">
              <n-input v-model="formData.prefix" placeholder="请输入前缀" />
            </n-form-item>
            <n-form-item label="标签">
              <n-dynamic-input
                v-model:value="formData.tags"
                preset="pair"
                key-placeholder="标签名"
                value-placeholder="标签值"
              />
            </n-form-item>
        </n-collapse-item>
      </n-collapse>
    </n-card>
     

    <!-- 高级设置 -->
    <n-card class="my-4">
      <n-collapse >
        <n-collapse-item title="高级设置" name="advanced">
          <n-form-item label="删除标记处理">
            <n-space vertical>
              <n-switch
                v-model:value="formData.expiredDeleteMark"
                :round="false"
              />
              <span class="ml-4 text-gray-500">如果没有留下任何版本，请删除对该对象的引用</span>
            </n-space>
          </n-form-item>

          <n-form-item label="版本清理">
            <n-space vertical>
              <n-switch
                v-model:value="formData.deleteAllExpired"
                :round="false"
              />
              <span class="ml-4 text-gray-500">删除所有过期版本</span>
            </n-space>
          </n-form-item>
        </n-collapse-item>
      </n-collapse>
    </n-card> 

    <n-space justify="center">
      <n-button @click="handleCancel">取消</n-button>
      <n-button type="primary" @click="handleSave">保存</n-button>
    </n-space>
  </n-form>
  </n-card>
  </n-modal>
</template>

<script setup>
import { ref } from 'vue'
import {
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NDynamicInput,
  NCollapse,
  NCollapseItem,
  NSwitch,
  NButton,
  NInputNumber
} from 'naive-ui'

const formRef = ref(null)
const formData = ref({
  ruleName: '',
  type: null,
  versionType: 'current',
  days: null,
  action: 'transition',
  tags:[{
    key:'',
    value:''
  }],
  expiredDeleteMark: false,
  deleteAllExpired: false
})


const typeOptions = [
  { label: '到期', value: 'expire' },
  { label: '过渡', value: 'transition' }
]

const versionOptions = [
  { label: '当前版本', value: 'current' },
  { label: '非当前版本', value: 'non-current' }
]

const actionOptions = [
  { label: '转储', value: 'transition' },
  { label: '删除', value: 'delete' }
]
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
}
</script>
