import { describe, expect, it } from 'vitest';

describe('logger', () => {
  it('should export logger object with correct methods', async () => {
    const { logger } = await import('../../utils/logger');

    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should check isDevelopment constant', async () => {
    const { isDevelopment } = await import('../../utils/logger');

    // 在测试环境中，isDevelopment 应该为 false
    expect(isDevelopment).toBe(false);
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have logger methods that can be called without errors', async () => {
    const { logger } = await import('../../utils/logger');

    // 在测试环境中，这些方法不应该抛出错误（即使它们不输出内容）
    expect(() => logger.log('test')).not.toThrow();
    expect(() => logger.warn('test')).not.toThrow();
    expect(() => logger.error('test')).not.toThrow();
    expect(() => logger.info('test')).not.toThrow();
    expect(() => logger.debug('test')).not.toThrow();
  });

  it('should handle multiple arguments without errors', async () => {
    const { logger } = await import('../../utils/logger');

    expect(() => logger.log('msg', 123, { key: 'value' }, [1, 2, 3])).not.toThrow();
    expect(() => logger.warn('msg', null, undefined)).not.toThrow();
  });

  it('should handle no arguments without errors', async () => {
    const { logger } = await import('../../utils/logger');

    expect(() => logger.log()).not.toThrow();
    expect(() => logger.debug()).not.toThrow();
  });
});
