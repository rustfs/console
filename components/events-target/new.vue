<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    :title="t('Add Event Destination')"
    class="max-w-screen-md"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-card v-show="!formData.type">
      <n-grid x-gap="12" y-gap="12" :cols="2">
        <n-gi v-for="item in typeOptions">
          <n-card class="cursor-pointer" @click="formData.type = item.value">
            <div class="flex flex-center leading-8">
              <img :src="item.iconUrl" class="w-8 h-8" />
              <span class="ms-2">{{ item.label }}</span>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>
    <n-card v-show="formData.type">
      <n-card class="mb-4 cursor-pointer" @click="formData.type = ''">
        <div class="flex flex-center leading-8">
          <img :src="iconUrl" class="w-8 h-8 me-2" />
          <span>
            {{ formData.type }}
          </span>
        </div>
      </n-card>
      <n-form ref="formRef" :model="formData" :rules="rules">
        <!-- Name 字段单独处理 -->
        <n-form-item :label="t('Name') + '(a_zA_Z0-9_-)'" path="name">
          <n-input
            v-model:value="formData.name"
            :allow-input="
              value => {
                // 只允许字母、数字、下划线
                return /^[A-Za-z0-9_]*$/.test(value);
              }
            "
            :placeholder="t('Please enter name')"
          />
        </n-form-item>

        <!-- 根据类型动态生成配置项 -->
        <n-form-item
          v-for="config in currentConfigOptions"
          :key="config.name"
          :label="config.label"
          :path="config.name"
        >
          <n-input
            v-if="config.type === 'text'"
            v-model:value="formData.config[config.name]"
            :placeholder="`${t('Please enter')} ${config.label.toLowerCase()}`"
          />
          <n-input
            v-else-if="config.type === 'password'"
            v-model:value="formData.config[config.name]"
            type="password"
            :placeholder="`${t('Please enter')} ${config.label.toLowerCase()}`"
          />
          <n-input-number
            v-else-if="config.type === 'number'"
            v-model:value="formData.config[config.name]"
            :placeholder="`${t('Please enter')} ${config.label.toLowerCase()}`"
            class="w-full"
          />
        </n-form-item>

        <n-space justify="center">
          <n-button @click="handleCancel">{{ t('Cancel') }}</n-button>
          <n-button type="primary" @click="handleSave">{{ t('Save') }}</n-button>
        </n-space>
      </n-form>
    </n-card>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import MqttIcon from '~/assets/svg/mqtt.svg';
import WebhooksIcon from '~/assets/svg/webhooks.svg';
import KafkaIcon from '~/assets/svg/kafka.svg';
import { NForm, NFormItem, NInput, NInputNumber, NSelect, NButton } from 'naive-ui';
import { useEventTarget } from '#imports';

const { t } = useI18n();
const { updateEventTarget } = useEventTarget();
const message = useMessage();

// 支持的存储类型
const typeOptions = [
  { label: t('MQTT'), value: 'MQTT', iconUrl: MqttIcon },
  { label: t('Webhook'), value: 'Webhook', iconUrl: WebhooksIcon },
  // { label: t('Kafka'), value: 'kafka', iconUrl: KafkaIcon },
];

// 不同类型的配置项

const configOptions = {
  MQTT: [
    { label: t('MQTT_BROKER'), name: 'broker', type: 'text' },
    // { label: t('MQTT_ENDPOINT'), name: 'endpoint', type: 'text' },
    { label: t('MQTT_TOPIC'), name: 'topic', type: 'text' },
    { label: t('MQTT_USERNAME'), name: 'username', type: 'text' },
    { label: t('MQTT_PASSWORD'), name: 'password', type: 'password' },
    { label: t('MQTT_QOS'), name: 'qos', type: 'number' },
    { label: t('MQTT_RECONNECT_INTERVAL'), name: 'reconnect_interval', type: 'number' },
    { label: t('MQTT_KEEP_ALIVE_INTERVAL'), name: 'keep_alive_interval', type: 'number' },
    { label: t('MQTT_QUEUE_DIR'), name: 'queue_dir', type: 'text' },
    { label: t('MQTT_QUEUE_LIMIT'), name: 'queue_limit', type: 'number' },
    { label: t('COMMENT_KEY'), name: 'comment', type: 'text' },
  ],
  Webhook: [
    { label: t('WEBHOOK_ENDPOINT'), name: 'endpoint', type: 'text' },
    { label: t('WEBHOOK_AUTH_TOKEN'), name: 'auth_token', type: 'text' },
    { label: t('WEBHOOK_QUEUE_LIMIT'), name: 'queue_limit', type: 'number' },
    { label: t('WEBHOOK_QUEUE_DIR'), name: 'queue_dir', type: 'text' },
    { label: t('WEBHOOK_CLIENT_CERT'), name: 'client_cert', type: 'text' },
    { label: t('WEBHOOK_CLIENT_KEY'), name: 'client_key', type: 'text' },
    { label: t('COMMENT_KEY'), name: 'comment', type: 'text' },
  ],
};

const formRef = ref(null);
const formData = ref({
  type: '',
  name: '',
  config: {},
});

// 计算当前类型的配置选项
const currentConfigOptions = computed(() => {
  return formData.value.type ? configOptions[formData.value.type] || [] : [];
});

// 监听类型变化，初始化配置字段
watch(
  () => formData.value.type,
  newType => {
    if (newType && configOptions[newType]) {
      const newConfig = {};
      configOptions[newType].forEach(item => {
        newConfig[item.name] = '';
      });
      formData.value.config = newConfig;
    }
  }
);
// 设置一个计算属性，用于通过typeOptions 以及当前选中的类型，返回一个图标
const iconUrl = computed(() => {
  const type = formData.value.type;
  return typeOptions.find(item => item.value === type)?.iconUrl || '';
});

const rules = {
  name: { required: true, message: t('Please enter name') },
  type: { required: true, message: t('Please select event target type') },
};

const visible = ref(false);

const open = () => {
  visible.value = true;
};

defineExpose({
  open,
});

const emmit = defineEmits(['search']);
const handleSave = () => {
  formRef.value?.validate(errors => {
    if (!errors) {
      // 验证名称格式
      if (!formData.value.name || !/^[A-Za-z0-9_]+$/.test(formData.value.name)) {
        message.error(t('Please enter name') + ' (a_zA_Z0-9_-)');
        return;
      }

      // 根据类型确定 target_type
      const target_type = formData.value.type === 'MQTT' ? 'notify_mqtt' : 'notify_webhook';
      const target_name = formData.value.name;

      // 将配置数据转换为 key_values 格式
      const key_values = Object.entries(formData.value.config)
        // .filter(([key, value]) => value !== '' && value != null) // 过滤空值
        .map(([key, value]) => ({
          key: key, // 转换为小写
          value: String(value),
        }));

      key_values.enable = 'enable';
      // 检查是否有配置项
      if (key_values.length === 0) {
        message.error(t('Please fill in at least one configuration item'));
        return;
      }

      const targetData = {
        key_values: key_values,
      };

      console.log('保存数据:', {
        target_type,
        target_name,
        targetData,
      });

      // 调用保存接口
      updateEventTarget(target_type, target_name, targetData)
        .then(res => {
          visible.value = false;
          // 重置表单
          formData.value = {
            type: '',
            name: '',
            config: {},
          };
          emmit('search');
          message.success(t('Event Target created successfully'));
        })
        .catch(error => {
          console.error('保存失败:', error);
          message.error(t('Failed to create event target'));
        });
    }
  });
};

const handleCancel = () => {
  visible.value = false;
  // 重置表单数据
  formData.value = {
    type: '',
    name: '',
    config: {},
  };
};
</script>
