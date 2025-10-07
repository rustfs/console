import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { cn, valueUpdater } from '../../lib/utils';

describe('cn', () => {
  it('should merge class names correctly', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', true && 'visible');
    expect(result).toBe('base visible');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('should handle objects with boolean values', () => {
    const result = cn({ active: true, disabled: false, pending: true });
    expect(result).toBe('active pending');
  });

  it('should merge Tailwind classes correctly (remove duplicates)', () => {
    const result = cn('px-4 py-2', 'px-6');
    // twMerge should keep only the last px-* class
    expect(result).toBe('py-2 px-6');
  });

  it('should handle empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle null and undefined', () => {
    const result = cn('foo', null, undefined, 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle mixed input types', () => {
    const result = cn('base', ['array1', 'array2'], { object1: true, object2: false }, null, 'final');
    expect(result).toBe('base array1 array2 object1 final');
  });

  it('should merge conflicting Tailwind utilities', () => {
    // twMerge should intelligently merge these
    const result = cn('text-sm', 'text-lg');
    expect(result).toBe('text-lg');
  });

  it('should preserve non-Tailwind classes', () => {
    const result = cn('custom-class', 'another-custom');
    expect(result).toBe('custom-class another-custom');
  });
});

describe('valueUpdater', () => {
  it('should update ref with direct value', () => {
    const myRef = ref(10);
    valueUpdater(20, myRef);
    expect(myRef.value).toBe(20);
  });

  it('should update ref with updater function', () => {
    const myRef = ref(10);
    valueUpdater((prev: number) => prev + 5, myRef);
    expect(myRef.value).toBe(15);
  });

  it('should handle string values', () => {
    const myRef = ref('hello');
    valueUpdater('world', myRef);
    expect(myRef.value).toBe('world');
  });

  it('should handle string updater function', () => {
    const myRef = ref('hello');
    valueUpdater((prev: string) => prev + ' world', myRef);
    expect(myRef.value).toBe('hello world');
  });

  it('should handle object values', () => {
    const myRef = ref({ count: 0 });
    valueUpdater({ count: 10 }, myRef);
    expect(myRef.value).toEqual({ count: 10 });
  });

  it('should handle object updater function', () => {
    const myRef = ref({ count: 0 });
    valueUpdater((prev: any) => ({ count: prev.count + 1 }), myRef);
    expect(myRef.value).toEqual({ count: 1 });
  });

  it('should handle array values', () => {
    const myRef = ref([1, 2, 3]);
    valueUpdater([4, 5, 6], myRef);
    expect(myRef.value).toEqual([4, 5, 6]);
  });

  it('should handle array updater function', () => {
    const myRef = ref([1, 2, 3]);
    valueUpdater((prev: number[]) => [...prev, 4], myRef);
    expect(myRef.value).toEqual([1, 2, 3, 4]);
  });

  it('should handle boolean values', () => {
    const myRef = ref(false);
    valueUpdater(true, myRef);
    expect(myRef.value).toBe(true);
  });

  it('should handle boolean updater function', () => {
    const myRef = ref(false);
    valueUpdater((prev: boolean) => !prev, myRef);
    expect(myRef.value).toBe(true);
  });

  it('should handle null values', () => {
    const myRef = ref<any>('something');
    valueUpdater(null, myRef);
    expect(myRef.value).toBeNull();
  });

  it('should handle undefined values', () => {
    const myRef = ref<any>('something');
    valueUpdater(undefined, myRef);
    expect(myRef.value).toBeUndefined();
  });

  it('should work with complex nested objects', () => {
    const myRef = ref({ user: { name: 'John', age: 30 } });
    valueUpdater(
      (prev: any) => ({
        user: { ...prev.user, age: prev.user.age + 1 },
      }),
      myRef
    );
    expect(myRef.value).toEqual({ user: { name: 'John', age: 31 } });
  });
});
