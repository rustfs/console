import { describe, expect, it } from 'vitest';
import { formatBytes, getBytes, makeRandomString, niceBytes } from '../../utils/functions';

describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KiB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MiB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GiB');
  });

  it('should handle fractional values', () => {
    expect(formatBytes(1536)).toBe('1.5 KiB'); // 1.5 KiB
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MiB');
  });

  it('should format using K8s units when specified', () => {
    expect(formatBytes(1024, true)).toBe('1.0 Ki');
    expect(formatBytes(1024 * 1024, true)).toBe('1.0 Mi');
    expect(formatBytes(1024 * 1024 * 1024, true)).toBe('1.0 Gi');
  });

  it('should handle large values', () => {
    const terabyte = 1024 * 1024 * 1024 * 1024;
    expect(formatBytes(terabyte)).toBe('1.0 TiB');

    const petabyte = terabyte * 1024;
    expect(formatBytes(petabyte)).toBe('1.0 PiB');
  });

  it('should handle negative values gracefully', () => {
    // 实际行为：负数的 Math.log 为 NaN，l 会是 0，所以总是格式化为 B 单位
    expect(formatBytes(-1)).toBe('-1.0 B');
    expect(formatBytes(-1024)).toBe('-1024.0 B');
  });

  it('should round to one decimal place', () => {
    expect(formatBytes(1234)).toBe('1.2 KiB');
    expect(formatBytes(1587)).toBe('1.5 KiB');
  });
});

describe('niceBytes', () => {
  it('should convert string bytes to nice format', () => {
    expect(niceBytes('0')).toBe('0 B');
    expect(niceBytes('1024')).toBe('1.0 KiB');
    expect(niceBytes('1048576')).toBe('1.0 MiB');
  });

  it('should handle invalid string input', () => {
    expect(niceBytes('invalid')).toBe('0 B');
    expect(niceBytes('')).toBe('0 B');
  });

  it('should use K8s units when specified', () => {
    expect(niceBytes('1024', true)).toBe('1.0 Ki');
    expect(niceBytes('1048576', true)).toBe('1.0 Mi');
  });

  it('should parse numeric strings with leading zeros', () => {
    expect(niceBytes('01024')).toBe('1.0 KiB');
  });
});

describe('getBytes', () => {
  it('should convert value and unit to bytes string', () => {
    expect(getBytes('1', 'B')).toBe('1');
    expect(getBytes('1', 'KiB')).toBe('1024');
    expect(getBytes('1', 'MiB')).toBe('1048576');
    expect(getBytes('1', 'GiB')).toBe('1073741824');
  });

  it('should handle fractional values', () => {
    expect(getBytes('1.5', 'KiB')).toBe('1536');
    expect(getBytes('2.5', 'MiB')).toBe('2621440');
  });

  it('should handle K8s units when specified', () => {
    expect(getBytes('1', 'Ki', true)).toBe('1024');
    expect(getBytes('1', 'Mi', true)).toBe('1048576');
    expect(getBytes('1', 'Gi', true)).toBe('1073741824');
  });

  it('should return "0" for invalid units', () => {
    expect(getBytes('1', 'InvalidUnit')).toBe('0');
    expect(getBytes('1', 'KB')).toBe('0');
  });

  it('should handle all valid units', () => {
    expect(getBytes('1', 'B')).toBe('1');
    expect(getBytes('1', 'KiB')).toBe('1024');
    expect(getBytes('1', 'MiB')).toBe('1048576');
    expect(getBytes('1', 'GiB')).toBe('1073741824');
    expect(getBytes('1', 'TiB')).toBe('1099511627776');
  });

  it('should handle zero value', () => {
    expect(getBytes('0', 'KiB')).toBe('0');
    expect(getBytes('0', 'MiB')).toBe('0');
  });
});

describe('makeRandomString', () => {
  it('should generate string with default length 20', () => {
    const result = makeRandomString();
    expect(result).toHaveLength(20);
  });

  it('should generate string with specified length', () => {
    expect(makeRandomString(10)).toHaveLength(10);
    expect(makeRandomString(5)).toHaveLength(5);
    expect(makeRandomString(50)).toHaveLength(50);
  });

  it('should generate string with only alphanumeric characters', () => {
    const result = makeRandomString(100);
    expect(result).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('should generate different strings on multiple calls', () => {
    const results = new Set();
    for (let i = 0; i < 100; i++) {
      results.add(makeRandomString(20));
    }
    // 100 个随机字符串应该都不相同（理论上有极小概率重复）
    expect(results.size).toBeGreaterThan(95);
  });

  it('should handle length of 1', () => {
    const result = makeRandomString(1);
    expect(result).toHaveLength(1);
    expect(result).toMatch(/^[a-zA-Z0-9]$/);
  });

  it('should handle length of 0', () => {
    const result = makeRandomString(0);
    expect(result).toBe('');
  });

  it('should generate strings within the character set range', () => {
    const validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    const result = makeRandomString(1000);

    for (const char of result) {
      expect(validChars).toContain(char);
    }
  });
});
