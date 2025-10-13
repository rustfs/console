<template>
  <n-modal
    :show="visible"
    @update:show="emit('close')"
    preset="card"
    :title="t('Object Versions')"
    class="max-w-screen-md"
  >
    <n-data-table :columns="columns" :data="versions" :pagination="pagination" />
    <n-button class="mt-4" @click="$emit('close')">{{ t('Close') }}</n-button>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, h } from 'vue';
import { useObject } from '@/composables/useObject';
import { useMessage } from 'naive-ui';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as _getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dayjs from 'dayjs';
import { NButton } from 'naive-ui';

const props = defineProps<{ bucketName: string; objectKey: string; visible: boolean }>();
const emit = defineEmits(['close', 'preview', 'refresh-parent']);
const { t } = useI18n();
const message = useMessage();

const versions = ref<any[]>([]);
const pagination = ref({ page: 1, pageSize: 10 });

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function shortVersionId(versionId: string): string {
  if (!versionId) return '';
  // 以 - . / 分割，取最后一段
  const parts = versionId.split(/[-./]/);
  return parts[parts.length - 1];
}

const columns = [
  {
    title: t('VersionId'),
    key: 'VersionId',
    render(row: any) {
      return shortVersionId(row.VersionId);
    },
  },
  {
    title: t('LastModified'),
    key: 'LastModified',
    render(row: any) {
      return row.LastModified ? dayjs(row.LastModified).format('YYYY-MM-DD HH:mm:ss') : '';
    },
  },
  {
    title: t('Size'),
    key: 'Size',
    render(row: any) {
      return typeof row.Size === 'number' ? formatBytes(row.Size) : '';
    },
  },
  {
    title: t('Action'),
    key: 'action',
    render(row: any) {
      return [
        h(
          'NButton',
          {
            size: 'small',
            style: 'cursor: pointer;',
            onClick: () => previewVersion(row),
          },
          t('Preview')
        ),
        h(
          'NButton',
          {
            size: 'small',
            style: 'margin:0 8px;cursor: pointer;',
            type: 'primary',
            onClick: () => downloadVersion(row),
          },
          t('Download')
        ),
        h(
          'NButton',
          {
            size: 'small',
            style: 'cursor: pointer;',
            type: 'primary',
            onClick: () => deleteVersion(row),
          },
          t('Delete')
        ),
      ];
    },
  },
];

watch(
  () => props.visible,
  val => {
    if (val) fetchVersions();
  }
);

async function fetchVersions() {
  const { getObjectVersions } = useObject({ bucket: props.bucketName });
  try {
    const { Versions } = await getObjectVersions(props.objectKey);
    versions.value = Versions || [];
  } catch (e: any) {
    message.error(t('Failed to fetch versions'));
  }
}

async function previewVersion(row: any) {
  // 触发父组件预览弹窗，传递 versionId
  emit('preview', row.VersionId);
}

// 新增：自定义带 versionId 的签名 URL 获取方法
async function getSignedUrlWithVersion(key: string, versionId: string, expiresIn = 3600) {
  // 直接用 useObject 里的 bucketName
  const $client = useNuxtApp().$s3Client;
  const command = new GetObjectCommand({
    Bucket: props.bucketName,
    Key: key,
    VersionId: versionId,
  });
  return await _getSignedUrl($client, command, { expiresIn });
}

async function downloadVersion(row: any) {
  try {
    const url = await getSignedUrlWithVersion(props.objectKey, row.VersionId);
    window.open(url, '_blank');
  } catch (e: any) {
    message.error(t('Download Failed'));
  }
}

async function deleteVersion(row: any) {
  const { deleteObject } = useObject({ bucket: props.bucketName });

  try {
    await deleteObject(props.objectKey, row.VersionId);
    message.success(t('Delete Success'));

    // 重新获取版本列表
    await fetchVersions();
    emit('refresh-parent');
  } catch (e: any) {
    message.error(t('Delete Failed'));
  }
}
</script>
