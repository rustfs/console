<template>
  <div>
    <n-modal
      v-model:show="visible"
      :mask-closable="false"
      preset="card"
      title="创建用户"
      class="max-w-screen-md"
      :segmented="{
        content: true,
        action: true,
      }">
      <n-card>
        <n-form
          ref="newformRef"
          :model="editForm"
          label-placement="left"
          :rules="rules"
          label-align="right"
          :label-width="130">
          <n-grid :cols="24" :x-gap="18">
            <n-form-item-grid-item :span="24" label="用户名" path="accessKey">
              <n-input v-model:value="editForm.accessKey" />
            </n-form-item-grid-item>
            <n-form-item-grid-item :span="24" label="秘钥" path="secretKey">
              <n-input v-model:value="editForm.secretKey" type="password" />
            </n-form-item-grid-item>
            <!-- <n-form-item-grid-item :span="24" label="分组" path="groups">
              <n-select v-model:value="editForm.groups" filterable multiple :options="groupsList" />
            </n-form-item-grid-item>
            <n-form-item-grid-item :span="24" label="策略" path="policies">
              <n-select v-model:value="editForm.policies" filterable multiple :options="policiesList" />
            </n-form-item-grid-item> -->
          </n-grid>
        </n-form>
      </n-card>
      <template #action>
        <n-space justify="center">
          <n-button @click="closeModal()">取消</n-button>
          <n-button type="primary" @click="submitForm">提交</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { type FormRules } from "naive-ui"
const { listPolicies } = usePolicies()
const { listGroup } = useGroups()
const message = useMessage()
const { createUser } = useUsers()
const visible = ref(false)

const editForm = reactive({
  accessKey: "",
  secretKey: "",
  groups: [],
  policies: [],
})

const rules: FormRules = {
  accessKey: [
    {
      required: true,
      message: "请输入用户名",
    },
  ],
  secretKey: [
    {
      required: true,
      message: "请输入秘钥",
    },
    // length>=8
    {
      type: "string",
      pattern: /^.{8,}$/,
      message: "秘钥长度不能小于8位",
    },
  ],
}

function openDialog() {
  // 获取策略列表
  // getPoliciesList()
  // 获取分组列表
  // getGroupsList()
  visible.value = true
}

function closeModal() {
  visible.value = false
  editForm.accessKey = ""
  editForm.secretKey = ""
  editForm.groups = []
  editForm.policies = []
}

defineExpose({
  openDialog,
})

const newformRef = ref()
const emit = defineEmits(["search"])
function submitForm(e: MouseEvent) {
  e.preventDefault()
  newformRef.value?.validate(async (errors: any) => {
    if (errors) {
      return
    }

    try {
      const res = await createUser({
        accessKey: editForm.accessKey,
        secretKey: editForm.secretKey,
        policy: "",
        status: "enabled",
      })
      message.success("添加成功")
      emit("search")
      closeModal()
    } catch (error) {
      message.error("添加失败")
    }
  })
}

// 获取策略列表
const policiesList = ref([])
const getPoliciesList = async () => {
  const res = await listPolicies()
  policiesList.value =
    res.policies.map((item: any) => {
      return {
        label: item.name,
        value: item.name,
      }
    }) || []
}

// 获取用户组列表
const groupsList = ref([])
const getGroupsList = async () => {
  const res = await listGroup()
  groupsList.value =
    res.groups.map((item: any) => {
      return {
        label: item,
        value: item,
      }
    }) || []
}
</script>

<style lang="scss" scoped></style>
