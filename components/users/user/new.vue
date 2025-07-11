<template>
  <div>
    <n-modal
      v-model:show="visible"
      :mask-closable="false"
      preset="card"
      :title="t('Create User')"
      class="max-w-screen-md"
      :segmented="{
        content: true,
        action: true,
      }"
    >
      <n-card>
        <n-form
          ref="newformRef"
          :model="editForm"
          label-placement="left"
          :rules="rules"
          label-align="right"
          :label-width="130"
        >
          <n-grid :cols="24" :x-gap="18">
            <n-form-item-grid-item :span="24" :label="t('Access Key')" path="accessKey">
              <n-input v-model:value="editForm.accessKey" />
            </n-form-item-grid-item>
            <n-form-item-grid-item :span="24" :label="t('Secret Key')" path="secretKey">
              <n-input v-model:value="editForm.secretKey" type="password" />
            </n-form-item-grid-item>
            <n-form-item-grid-item :span="24" :label="t('Groups')" path="groups">
              <n-select v-model:value="editForm.groups" filterable multiple :options="groupsList" />
            </n-form-item-grid-item>

            <n-form-item-grid-item :span="24" :label="t('Policy')" path="policies">
              <n-select
                v-model:value="editForm.policies"
                filterable
                multiple
                :options="policiesList"
              />
            </n-form-item-grid-item>
          </n-grid>
        </n-form>
      </n-card>
      <template #action>
        <n-space justify="center">
          <n-button @click="closeModal()">{{ t('Cancel') }}</n-button>
          <n-button type="primary" @click="submitForm">{{ t('Submit') }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { type FormRules } from 'naive-ui';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const { listPolicies, setUserOrGroupPolicy } = usePolicies();
const { listGroup } = useGroups();
const message = useMessage();
const { createUser } = useUsers();
const visible = ref(false);

const editForm = reactive({
  accessKey: '',
  secretKey: '',
  groups: [],
  policies: [],
});

const rules: FormRules = {
  accessKey: [
    {
      required: true,
      message: t('Please enter username'),
    },
  ],
  secretKey: [
    {
      required: true,
      message: t('Please enter secret key'),
    },
    // length>=8
    {
      type: 'string',
      pattern: /^.{8,}$/,
      message: t('Secret key length cannot be less than 8 characters'),
    },
  ],
};

function openDialog() {
  // 获取策略列表
  getPoliciesList();
  // 获取分组列表
  getGroupsList();
  visible.value = true;
}

function closeModal() {
  visible.value = false;
  editForm.accessKey = '';
  editForm.secretKey = '';
  editForm.groups = [];
  editForm.policies = [];
}

defineExpose({
  openDialog,
});

const newformRef = ref();
const emit = defineEmits(['search']);
function submitForm(e: MouseEvent) {
  e.preventDefault();
  newformRef.value?.validate(async (errors: any) => {
    if (errors) {
      return;
    }

    try {
      const res = await createUser({
        accessKey: editForm.accessKey,
        secretKey: editForm.secretKey,
        status: 'enabled',
      });

      // 添加完成之后设置policy
      setUserOrGroupPolicy({
        policyName: editForm.policies,
        userOrGroup: editForm.accessKey,
        isGroup: false,
      });

      // 添加完成之后设置Group

      message.success(t('Add Success'));
      emit('search');
      closeModal();
    } catch (error) {
      message.error(t('Add Failed'));
    }
  });
}

// 获取策略列表
const policiesList = ref<any[]>([]);

const getPoliciesList = async () => {
  const res = await listPolicies();
  policiesList.value = Object.keys(res)
    .sort((a, b) => a.localeCompare(b))
    .map(key => {
      return {
        label: key,
        value: key,
      };
    });
};

// 获取用户组列表
const groupsList = ref([]);
const getGroupsList = async () => {
  const res = await listGroup();
  groupsList.value =
    res?.map((item: any) => {
      return {
        label: item,
        value: item,
      };
    }) || [];
};
</script>

<style lang="scss" scoped></style>
