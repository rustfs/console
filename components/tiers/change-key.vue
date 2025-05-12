<template>
  <n-modal v-model:show="modalVisible" :mask-closable="false" preset="card" :title="t('Update Key')" class="max-w-screen-md" :segmented="{
    content: true,
    action: true,
  }">
    <n-card>
      <n-form ref="formRef" label-placement="left" :model="formModel" :rules="rules" label-align="center" :label-width="130">
        <n-grid :cols="24" :x-gap="18">
          <n-form-item-gi :span="24" :label="t('Access Key')" path="accesskey">
            <n-input v-model:value="formModel.accesskey" />
          </n-form-item-gi>
          <n-form-item-gi :span="24" :label="t('Secret Key')" path="secretkey">
            <n-input v-model:value="formModel.secretkey" show-password-on="mousedown" type="password" />
          </n-form-item-gi>
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
</template>
<script setup lang="ts">
import type { FormInst } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
const usetier = useTiers()


const { t } = useI18n()
interface Props {
  visible: boolean,
  name: string
}
const { visible,name } = defineProps<Props>()
const message = useMessage()

const emit = defineEmits<Emits>()
const defaultFormModal = {
  accesskey: '',
  secretkey: '',
}
const formModel = ref({ ...defaultFormModal })

// 验证
const rules = ref({
  accesskey: {
    required: true,
    trigger: ["blur", "input"],
    message: t("Please enter Access Key"),
  },
  secretkey: {
    required: true,
    trigger: ["blur", "input"],
    message: t("Please enter Secret Key"),
  },
})

interface Emits {
  (e: "update:visible", visible: boolean): void
  (e: "search"): void
}

const modalVisible = computed({
  get() {
    return visible
  },
  set(visible) {
    closeModal(visible)
  },
})
function closeModal(visible = false) {
  emit("update:visible", visible)
  formModel.value = { ...defaultFormModal }
}


const formRef = ref<FormInst | null>(null)
async function submitForm(e: MouseEvent) {
  // e.preventDefault()
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      try {
        // const res = await createServiceAccount({
        //   ...formModel.value,
        //   policy: !formModel.value.impliedPolicy ? JSON.stringify(JSON.parse(formModel.value.policy)) : null,
        //   expiration: formModel.value.expiry ? new Date(formModel.value.expiry).toISOString() : null,
        // })
        const res = await usetier.updateTiers(name,{
          ...formModel.value,
        })
        message.success(t("Update Success"))
        closeModal()
        emit("search")
      } catch (error) {
        console.log("🚀 ~ submitForm ~ error:", error)
        message.error(t("Update Failed"))
      }
    } else {
      console.log(errors)
      message.error(t("Please fill in the correct format"))
    }
  })
}


</script>

<style scoped></style>
