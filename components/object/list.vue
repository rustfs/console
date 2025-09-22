<template>
  <n-page-header subtitle="" @back="router.back()">
    <template #title>
      <div class="flex items-center justify-between">
        <n-input :placeholder="t('Search')" v-model:value="searchTerm" @update:value="handleSearch">
          <template #prefix>
            <Icon name="ri:search-2-line" />
          </template>
        </n-input>
      </div>
    </template>
    <template #extra>
      <div class="flex items-center gap-4">
        <object-upload-stats />
        <object-delete-stats />
        <n-button @click="() => handleNewObject(true)">
          <Icon name="ri:add-line" class="mr-2" />
          <span>{{ t('New Folder') }}</span>
        </n-button>
        <n-button @click="() => handleNewObject(false)">
          <Icon name="ri:add-line" class="mr-2" />
          <span>{{ t('New File') }}</span>
        </n-button>
        <n-button @click="() => (uploadPickerVisible = true)">
          <Icon name="ri:file-add-line" class="mr-2" />
          <span>{{ t('Upload File') + '/' + t('Folder') }}</span>
        </n-button>
        <n-button :disabled="!checkedKeys.length" secondary @click="handleBatchDelete">
          <template #icon>
            <Icon name="ri:delete-bin-5-line"></Icon>
          </template>
          {{ t('Delete Selected') }}
        </n-button>
        <n-button :disabled="!checkedKeys.length" secondary @click="downloadMultiple">
          <Icon name="ri:download-cloud-2-line" class="mr-2" />
          <span>{{ t('Download') }}</span>
        </n-button>
        <n-button @click="() => refresh()">
          <Icon name="ri:refresh-line" class="mr-2" />
          <span>{{ t('Refresh') }}</span>
        </n-button>
      </div>
    </template>
  </n-page-header>
  <n-data-table
    class="border dark:border-neutral-700 rounded overflow-hidden"
    :columns="columns"
    :data="filteredObjects"
    :row-key="rowKey"
    @update:checked-row-keys="handleCheck"
    :pagination="false"
    :bordered="false"
  />
  <object-upload-picker
    :show="uploadPickerVisible"
    @update:show="
      val => {
        uploadPickerVisible = val;
        refresh();
      }
    "
    :bucketName="bucketName"
    :prefix="prefix"
  />
  <object-new-form
    :show="newObjectFormVisible"
    :asPrefix="newObjectAsPrefix"
    @update:show="
      val => {
        newObjectFormVisible = val;
        refresh();
      }
    "
    :bucketName="bucketName"
    :prefix="prefix"
  />
  <n-button-group class="ml-auto">
    <n-button @click="goToPreviousPage" :disabled="!continuationToken">
      <Icon name="ri:arrow-left-s-line" class="mr-2" />
      <span>{{ t('Previous Page') }}</span>
    </n-button>
    <n-button @click="goToNextPage" :disabled="!nextToken">
      <span>{{ t('Next Page') }}</span>
      <Icon name="ri:arrow-right-s-line" class="ml-2" />
    </n-button>
  </n-button-group>
  <object-info ref="infoRef" />
</template>

<script setup lang="ts">
const { $s3Client } = useNuxtApp();
const { t } = useI18n();
import { useAsyncData, useRoute, useRouter } from '#app';
import { NuxtLink } from '#components';
import { ListObjectsV2Command, type _Object, type CommonPrefix } from '@aws-sdk/client-s3';
import dayjs from 'dayjs';
import { NButton, NSpace, NPopconfirm, type DataTableColumns, type DataTableRowKey } from 'naive-ui';
import { Icon } from '#components';
import { joinRelativeURL } from 'ufo';
import { computed, ref, watch, type VNode } from 'vue';
import { useDeleteTaskManagerStore } from '~/store/delete-tasks';
import { useUploadTaskManagerStore } from '~/store/upload-tasks';
import { useBucket } from '~/composables/useBucket';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const message = useMessage();
const props = defineProps<{ bucket: string; path: string }>();

const uploadPickerVisible = ref(false);
const newObjectFormVisible = ref(false);
const newObjectAsPrefix = ref(false);
const searchTerm = ref('');

// Add debounce function for search
const debounce = (fn: Function, delay: number) => {
  let timer: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

const handleSearch = debounce(() => {
  // Reset pagination when searching
  if (continuationToken.value) {
    continuationToken.value = undefined;
    tokenHistory.value = [];
  }
}, 300);

// 上传任务
const uploadTaskStore = useUploadTaskManagerStore();
const uploadTasks = computed(() => uploadTaskStore.tasks);

// 删除任务
const deleteTaskStore = useDeleteTaskManagerStore();
const deleteTasks = computed(() => deleteTaskStore.tasks);

// 当任务变化时，刷新数据
watch(
  () => uploadTasks,
  () => setTimeout(refresh, 500),
  { deep: true }
);
watch(
  () => deleteTasks,
  () => setTimeout(refresh, 500),
  { deep: true }
);

// bucketName
const bucketName = computed(() => props.bucket as string);
// 当前路径的前缀, example: '/folder1/folder2/'
const prefix = computed(() => decodeURIComponent(props.path as string));

// query 参数
const pageSize = computed(() => parseInt(route.query.pageSize as string, 10));
// 将 continuationToken 改为 ref
const continuationToken = ref<string | undefined>(undefined);

// 新建文件夹
const handleNewObject = (asPrefix: boolean) => {
  newObjectFormVisible.value = true;
  newObjectAsPrefix.value = asPrefix;
};

const bucketPath = (path?: string | Array<string>) => {
  if (Array.isArray(path)) {
    path = path.join('/');
  }

  return joinRelativeURL('/browser', encodeURIComponent(bucketName.value), path ? encodeURIComponent(path) : '');
};

interface RowData {
  Key: string;
  type: 'prefix' | 'object';
  Size: number;
  LastModified: string;
}

const infoRef = ref();
const columns: DataTableColumns<RowData> = [
  {
    type: 'selection',
  },
  {
    key: 'Key',
    title: t('Object'),
    render: (row: { Key: string; type: 'prefix' | 'object' }) => {
      const displayKey = prefix.value ? row.Key.substring(prefix.value.length) : row.Key;
      let label: string | VNode = displayKey || '/';

      if (row.type === 'prefix') {
        label = h('span', { class: 'inline-flex items-center gap-2' }, [icon('ri:folder-line'), label]);
      }

      const keyInUri = row.Key;
      return h(
        NuxtLink,
        {
          href: row.type === 'prefix' ? bucketPath(keyInUri) : '',
          class: 'block text-cyan-400 cursor-pointer',
          onClick: (e: MouseEvent) => {
            if (row.type === 'prefix') return;
            infoRef.value.openDrawer(bucketName.value, row.Key);
            return;
          },
        },
        () => label
      );
    },
  },
  {
    key: 'Size',
    title: t('Size'),
    render: (row: { Size: number }) => (row.Size ? formatBytes(row.Size) : ''),
  },
  {
    key: 'LastModified',
    title: t('Update Time'),
    render: (row: { LastModified: string }) => {
      return row.LastModified ? dayjs(row.LastModified).format('YYYY-MM-DD HH:mm:ss') : '';
    },
  },
  {
    title: t('Actions'),
    key: 'actions',
    align: 'center',
    width: 100,
    render: (row: RowData) => {
      return h(
        NSpace,
        {
          justify: 'center',
        },
        {
          default: () => [
            h(
              NPopconfirm,
              { onPositiveClick: () => handledownload(row) },
              {
                default: () => t('Confirm Download'),
                trigger: () =>
                  h(
                    NButton,
                    { size: 'small', secondary: true },
                    {
                      default: () => '',
                      icon: () => h(Icon, { name: 'ri:download-2-line' }),
                    }
                  ),
              }
            ),
          ],
        }
      );
    },
  },
];

interface ListObjectsResponse {
  contents: _Object[];
  commonPrefixes: CommonPrefix[];
  nextContinuationToken: string | null;
  isTruncated: boolean;
}
const randomString = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
const salt = ref(randomString());
// 在服务端获取数据
const { data, refresh } = await useAsyncData<ListObjectsResponse>(
  `objectsData-${salt.value}&${prefix.value}&${pageSize.value}&${continuationToken.value}`,
  async () => {
    const params = {
      Bucket: bucketName.value,
      MaxKeys: pageSize.value || 25,
      Delimiter: '/',
      Prefix: prefix.value || undefined,
      ContinuationToken: continuationToken.value,
    };

    const result = await $s3Client.send(new ListObjectsV2Command(params));

    return {
      contents: result.Contents || [],
      commonPrefixes: result.CommonPrefixes || [],
      nextContinuationToken: result.NextContinuationToken || null,
      isTruncated: result.IsTruncated ?? false,
    };
  }
);

watch(
  continuationToken,
  () => {
    refresh();
  },
  { deep: true }
);

const contents = computed(() => data.value?.contents || []);
const commonPrefixes = computed(() => data.value?.commonPrefixes || []);
const nextToken = computed(() => data.value?.nextContinuationToken || null);

const objects = computed(() => {
  return commonPrefixes.value
    .map(prefix => {
      return {
        Key: prefix.Prefix,
        type: 'prefix',
        Size: 0,
      };
    })
    .concat(
      contents.value.map(object => {
        return {
          Key: object.Key,
          type: 'object',
          Size: object.Size ?? 0,
          LastModified: object.LastModified ?? new Date(0),
        };
      })
    );
});

// New computed property to filter objects based on search term
const filteredObjects = computed(() => {
  if (!searchTerm.value.trim()) {
    return objects.value;
  }

  const term = searchTerm.value.toLowerCase();
  return objects.value.filter(obj => {
    const displayKey = prefix.value ? obj.Key?.substring(prefix.value.length) : obj.Key;
    return displayKey?.toLowerCase().includes(term);
  });
});

/** ************************************批量删除********************************* */
function rowKey(row: any): string {
  return row.Key || '';
}

const checkedKeys = ref<DataTableRowKey[]>([]);
function handleCheck(keys: DataTableRowKey[]) {
  // 过滤掉 undefined
  checkedKeys.value = keys.filter((k): k is string => typeof k === 'string');
  return checkedKeys;
}
const objectApi = useObject({ bucket: bucketName.value });
const bucketApi = useBucket({});

// 批量删除
function handleBatchDelete() {
  dialog.error({
    title: t('Warning'),
    content: t('Are you sure you want to delete all selected objects?'),
    positiveText: t('Confirm'),
    negativeText: t('Cancel'),
    onPositiveClick: async () => {
      if (!checkedKeys.value.length) {
        message.error(t('Please select at least one item'));
        return;
      }
      try {
        await Promise.all(
          checkedKeys.value.map(async item => {
            const findOne = objects.value.find(obj => obj.Key === item);
            // 目录删除
            // 递归查询目录下的所有文件，然后删除
            if (findOne?.type === 'prefix' && findOne?.Key) {
              return await objectApi.mapAllFiles(bucketName.value, findOne.Key, (fileKey: string) => {
                deleteTaskStore.addKeys([fileKey], bucketName.value);
              });
            }

            return deleteTaskStore.addKeys([String(item)], bucketName.value);
          })
        );

        message.success(t('Delete task created'));
        salt.value = randomString();
        refresh();
      } catch (error) {
        message.error(t('Delete Failed'));
      }
    },
  });
}
/** ************************************批量删除********************************* */

/** ************************************下载********************************* */
// 下载
const handledownload = async (item: any) => {
  if (item.type === 'object') {
    // 单文件下载
    const msg = message.loading(t('Getting URL'));
    const url = await objectApi.getSignedUrl(item.Key);
    msg.destroy();
    window.open(url, '_blank');
  } else if (item.type === 'prefix') {
    // 文件夹下载
    const msg = message.loading(t('Preparing folder...'));
    // 递归获取所有文件
    const files: string[] = [];
    await objectApi.mapAllFiles(bucketName.value, item.Key, (fileKey: string) => {
      files.push(fileKey);
    });

    if (files.length === 0) {
      msg.destroy();
      message.warning(t('Folder is empty'));
      return;
    }

    msg.destroy();
    const zip = new JSZip();

    // 批量获取文件内容并添加到 zip
    const downloadMsg = message.loading(t('Downloading files...'));
    await Promise.all(
      files.map(async fileKey => {
        const url = await objectApi.getSignedUrl(fileKey);
        const response = await fetch(url);
        const blob = await response.blob();
        // 保持相对路径
        zip.file(fileKey.substring(item.Key.length), blob);
      })
    );
    downloadMsg.destroy();

    // 生成 zip 并下载
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${item.Key.replace(/\/$/, '') || 'folder'}.zip`);
    message.success(t('Download ready'));
  }
};

// 批量下载
const downloadMultiple = async () => {
  if (!checkedKeys.value.length) {
    message.warning(t('Please select at least one item'));
    return;
  }
  // 收集文件 loading
  let collectMsg = message.loading(t('Collecting files'));
  // 1. 找到所有选中的对象
  const selectedItems = objects.value.filter(obj => checkedKeys.value.includes(obj.Key as string));
  // 2. 递归收集所有文件
  let allFiles: { key: string; relative: string }[] = [];
  for (const item of selectedItems) {
    if (item.type === 'object') {
      const key = item.Key || '';
      const rel = prefix.value ? key.substring(prefix.value.length) : key;
      allFiles.push({ key, relative: rel });
    } else if (item.type === 'prefix') {
      const key = item.Key || '';
      await objectApi.mapAllFiles(bucketName.value, key, fileKey => {
        const rel = prefix.value ? fileKey.substring(prefix.value.length) : fileKey;
        allFiles.push({ key: fileKey, relative: rel });
      });
    }
  }
  collectMsg.destroy();
  if (allFiles.length === 0) {
    message.warning(t('No files to download'));
    return;
  }
  // 下载文件 loading，带进度
  let percent = ref(0);
  const total = allFiles.length;
  let finished = 0;
  let downloadMsg: any = null;
  const updateDownloadMsg = () => {
    if (downloadMsg) downloadMsg.destroy();
    downloadMsg = message.loading(`${t('Downloading files')} ${Math.round((finished / total) * 100)}%`, {
      duration: 0,
    });
  };
  updateDownloadMsg();
  const zip = new JSZip();
  await Promise.all(
    allFiles.map(async ({ key, relative }) => {
      const url = await objectApi.getSignedUrl(key);
      const response = await fetch(url);
      const blob = await response.blob();
      zip.file(relative, blob);
      finished++;
      updateDownloadMsg();
    })
  );
  if (downloadMsg) downloadMsg.destroy();
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `download.zip`);
  message.success(t('Download ready'));
};
/** ************************************下载********************************* */

// 为了实现 "Previous" 功能，需要记录访问过的 token 列表。
// 因为我们是通过路由导航，每次下一页时会改变 URL，从而 SSR 获取新数据。
// 当访问过的 token 会体现在浏览器历史记录中。
// 在这种设计中，每次点击 Next/Previous 都会换 URL，并生成新 SSR 页面。
// 因此"上一页"可以通过浏览器后退实现，也可以在数据中保存 token 来人工实现。
// 这里演示一个简化版本——在客户端保存 tokenHistory。
// 请注意：刷新后 tokenHistory 会丢失，因为它是前端状态。
const tokenHistory = ref<string[]>([]);

// 当页面加载后，如果 continuationToken 有值，就表示不是第一页
// 将当前 continuationToken 添加到历史中
if (continuationToken.value && !tokenHistory.value.includes(continuationToken.value)) {
  tokenHistory.value.push(continuationToken.value);
}

// previousToken 根据 tokenHistory 来确定
// tokenHistory 中最后一个是当前页的 token，上一个则是 previousToken
const previousToken = computed(() => {
  if (tokenHistory.value.length < 2) return null;
  // 倒数第二个是上一页的 token
  return tokenHistory.value[tokenHistory.value.length - 2];
});

// 修改分页方法
function goToNextPage() {
  if (nextToken.value) {
    continuationToken.value = nextToken.value;
    tokenHistory.value.push(nextToken.value);
  }
}

function goToPreviousPage() {
  if (previousToken.value) {
    continuationToken.value = previousToken.value;
    // 将上一页 token 之后的记录删除
    const prevIndex = tokenHistory.value.indexOf(previousToken.value);
    tokenHistory.value.splice(prevIndex + 1);
  } else {
    // 回到第一页
    continuationToken.value = undefined;
    tokenHistory.value = [];
  }
}
</script>
