<template>
   <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    title="添加桶复制规则"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-card>
  <n-form label-placement="left" :label-width='100' ref="formRef" :model="formData">
    <n-form-item label="优先级" path="type">
       <n-input v-model="formData.level"/>
    </n-form-item>
    <n-form-item label="目标地址" path="type">
       <n-input v-model="formData.endpoint"/>
    </n-form-item>
    <n-form-item label="使用TLS" path="tls">
      <n-switch
        v-model:value="formData.tls"
        :round="false"
      />
    </n-form-item>
    <n-form-item label="Access Key" path="type">
       <n-input v-model="formData.accesskey"/>
    </n-form-item>
    <n-form-item label="Secret Key" path="type">
       <n-input v-model="formData.secrretkey"/>
    </n-form-item>
    <n-form-item label="目标存储空间" path="type">
       <n-input v-model="formData.bucket"/>
    </n-form-item>
    <n-form-item label="地区" path="type">
       <n-input v-model="formData.region"/>
    </n-form-item>
    <n-form-item label="复制模式" path="type">
       <n-input v-model="formData.mode"/>
    </n-form-item>

    <n-form-item label="带宽" path="type">
       <n-input v-model="formData.daikuan"/>
    </n-form-item>
    <n-form-item label="健康检查时长" path="type">
       <n-input v-model="formData.timelong"/>
    </n-form-item>
    <n-form-item label="存储类型" path="type">
       <n-input v-model="formData.storageType"/>
    </n-form-item>

    <!-- 对象搜索 -->
    <n-card title="对象搜索">  
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
    </n-card>
     

    <!-- 复制选项 -->
    <n-card class="my-4">
      <n-collapse >
        <n-collapse-item title="复制选项" name="advanced">
          <n-form-item label="现有对象">
            <n-space >
              <n-switch
                v-model:value="formData.expiredDeleteMark"
                :round="false"
              />
              <span class="ml-4 text-gray-500">复制现有对象</span>
            </n-space>
          </n-form-item>

          <n-form-item label="元数据同步">
            <n-space >
              <n-switch
                v-model:value="formData.deleteAllExpired"
                :round="false"
              />
              <span class="ml-4 text-gray-500">元数据同步</span>
            </n-space>
          </n-form-item>

          <n-form-item label="删除标记">
            <n-space >
              <n-switch
                v-model:value="formData.delete"
                :round="false"
              />
              <span class="ml-4 text-gray-500">复制软删除</span>
            </n-space>
          </n-form-item>

          <n-form-item label="删除">
            <n-space >
              <n-switch
                v-model:value="formData.deleteforever"
                :round="false"
              />
              <span class="ml-4 text-gray-500">复制版本化删除</span>
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
  NDynamicInput,
  NCollapse,
  NCollapseItem,
  NSwitch,
  NButton,
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
