import { exportFile } from '~/utils/export-file';

export const useImportExport = () => {
  const { $api } = useNuxtApp();
  const message = useMessage();
  const { t } = useI18n();

  const isLoading = ref(false);

  /**
   * 导出完整的IAM配置
   * 调用后端 /export-iam 接口，返回ZIP格式文件
   */
  const exportIamConfig = async (): Promise<void> => {
    try {
      isLoading.value = true;

      // 调用后端导出接口，不解析JSON以获取原始Response对象
      const response = await $api.request('/export-iam', {
        method: 'GET',
        headers: {
          'Accept': 'application/zip',
        },
      }, false);

      // 生成文件名，包含时间戳
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const fileName = `iam-config-export-${timestamp}.zip`;

      // 获取blob数据
      const blob = await response.blob();

      // 创建包含blob和headers的响应对象格式，兼容exportFile函数
      const exportResponse = {
        data: blob,
        headers: {
          'content-type': 'application/zip',
          filename: encodeURIComponent(fileName),
        },
      };

      // 使用现有的导出工具函数下载文件
      exportFile(exportResponse, fileName);

      message.success(t('IAM configuration exported successfully'));
    } catch (error: any) {
      console.error('IAM export error:', error);
      message.error(error.message || t('Failed to export IAM configuration'));
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 导入IAM配置
   * 调用后端 /import-iam 接口，上传ZIP格式文件
   */
  const importIamConfig = async (file: File): Promise<void> => {
    try {
      isLoading.value = true;

      // 调用后端导入接口
      await $api.request('/import-iam', {
        method: 'PUT',
        body: file, // 直接发送文件对象
        headers: {
          'Content-Type': 'application/zip',
        },
      }, false);

      message.success(t('IAM configuration imported successfully'));
    } catch (error: any) {
      console.error('IAM import error:', error);
      message.error(error.message || t('Failed to import IAM configuration'));
    } finally {
      isLoading.value = false;
    }
  };

  return {
    isLoading: readonly(isLoading),
    exportIamConfig,
    importIamConfig,
  };
};
