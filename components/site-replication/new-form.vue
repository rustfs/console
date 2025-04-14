<template>
   <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    title="添加站点复制"
    class="max-w-screen-lg"
    :segmented="{
      content: true,
      action: true,
    }">
    <n-card title="添加复制站点">
      <p>注意：添加或编辑对等站点时，每个站点的 AccessKey 和 SecretKey 值都是必需的</p>
      <n-form ref="currentFormRef" :model="currentSite" :rules="rules">
        <!-- 当前站点 -->
        <n-flex  style="margin-top: 16px;">
          <n-card  title="当前站点"  >
            <n-space direction="vertical" >
              <n-form-item label="站点名称" path="name">
                <n-input v-model:value="currentSite.name" placeholder="站点名称" />
              </n-form-item>
              <n-form-item label="Endpoint *" path="endpoint">
                <n-input v-model:value="currentSite.endpoint" placeholder="Endpoint" />
              </n-form-item>
              <n-form-item label="Access Key *" path="accessKey">
                <n-input v-model:value="currentSite.accessKey" placeholder="Access Key" />
              </n-form-item>
              <n-form-item label="Secret Key *" path="secretKey">
                <n-input type="password" v-model:value="currentSite.secretKey" placeholder="Secret Key" />
              </n-form-item>
            </n-space>
          </n-card>
        </n-flex>

        <!-- 远程站点 -->
        <n-flex direction="vertical" style="margin-top: 16px;">
          <n-card title="远程站点">
            <n-space direction="vertical">
               <n-dynamic-input :min='1' v-model:value="remoteSite" :on-create="onCreate">
                <template #default="{ value }" >
                   <n-grid x-gap="12" :cols="4">
                    <n-gi>
                      <n-form-item label="站点名称" path="name">
                        <n-input v-model:value="value.name" placeholder="站点名称" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="Endpoint *" path="endpoint">
                        <n-input v-model:value="value.endpoint" placeholder="Endpoint" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                        <n-form-item label="Access Key *" path="accessKey">
                          <n-input v-model:value="value.accessKey" placeholder="Access Key" />
                        </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="Secret Key *" path="secretKey">
                        <n-input type="password" v-model:value="value.secretKey" placeholder="Secret Key" />
                      </n-form-item>
                    </n-gi>
                  </n-grid>
                </template>
                </n-dynamic-input>
            </n-space>
          </n-card>
        </n-flex>
      </n-form>
      <!-- 按钮 -->
      <n-space justify="center" style="margin-top: 16px;">
        <n-button type="primary" @click="save">保存</n-button>
        <n-button @click="cancel">取消</n-button>
      </n-space>
    </n-card>
  </n-modal>
</template>

<script setup>
import { ref } from 'vue';

const currentSite = ref({
  name: '',
  endpoint: 'http://127.0.0.1:7000',
  accessKey: 'rusyfsadmin',
  secretKey: ''
});

const remoteSite = ref([{
  name: '',
  endpoint: '',
  accessKey: '',
  secretKey: ''
}]);

const onCreate = () => {
  return {
    name: '',
    endpoint: '',
    accessKey: '',
    secretKey: ''
  };
};

const rules = {
  endpoint: [
    { required: true, message: 'Endpoint 必须提供', trigger: 'blur' }
  ],
  accessKey: [
    { required: true, message: 'Access Key 必须提供', trigger: 'blur' }
  ],
  secretKey: [
    { required: true, message: 'Secret Key 必须提供', trigger: 'blur' }
  ]
};

const currentFormRef = ref(null);
const save = () => {
  // Save logic here
  console.log('Current Site:', currentSite.value);
  console.log('Remote Site:', remoteSite.value);
};

const cancel = () => {
  // Cancel logic here
};

const visible = ref(false);
const open = () => {
  visible.value = true
}

defineExpose({
  open
})
</script>

<style scoped >
:deep(.n-dynamic-input-item__action){
  align-self: center !important;
}
</style>
