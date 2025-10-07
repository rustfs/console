import { describe, expect, it } from 'vitest'
import { arrayToTree } from '../../utils/array'

describe('arrayToTree', () => {
  it('should convert flat array to tree structure', () => {
    const input = [
      { id: 1, pid: null, name: 'root1' },
      { id: 2, pid: 1, name: 'child1' },
      { id: 3, pid: 1, name: 'child2' },
      { id: 4, pid: null, name: 'root2' }
    ]

    const result = arrayToTree(input)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[0].children).toHaveLength(2)
    expect(result[0].children[0].id).toBe(2)
    expect(result[0].children[1].id).toBe(3)
    expect(result[1].id).toBe(4)
    expect(result[1].children).toBeUndefined()
  })

  it('should handle empty array', () => {
    const result = arrayToTree([])
    expect(result).toEqual([])
  })

  it('should handle single item without parent', () => {
    const input = [{ id: 1, pid: null, name: 'root' }]
    const result = arrayToTree(input)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
    expect(result[0].children).toBeUndefined()
  })

  it('should handle nested multiple levels', () => {
    const input = [
      { id: 1, pid: null, name: 'root' },
      { id: 2, pid: 1, name: 'level1' },
      { id: 3, pid: 2, name: 'level2' },
      { id: 4, pid: 3, name: 'level3' }
    ]

    const result = arrayToTree(input)

    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].children).toHaveLength(1)
    expect(result[0].children[0].children[0].children).toHaveLength(1)
    expect(result[0].children[0].children[0].children[0].id).toBe(4)
  })

  it('should handle pid with value 0 (falsy edge case)', () => {
    // Note: 这是一个已知的边界情况 - 当 pid 为 0 时，由于使用了 && 运算符
    // 会被当作假值处理，导致无法正确识别父节点
    const input = [
      { id: 0, pid: null, name: 'root' },
      { id: 1, pid: 0, name: 'child' }
    ]

    const result = arrayToTree(input)

    // 实际行为：两个节点都成为根节点，因为 pid: 0 被当作假值
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(0)
    expect(result[1].id).toBe(1)
    expect(result[1].children).toBeUndefined()
  })

  it('should handle orphaned nodes (pid references non-existent parent)', () => {
    const input = [
      { id: 1, pid: null, name: 'root' },
      { id: 2, pid: 999, name: 'orphan' }
    ]

    const result = arrayToTree(input)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
  })

  it('should handle multiple children at same level', () => {
    const input = [
      { id: 1, pid: null, name: 'root' },
      { id: 2, pid: 1, name: 'child1' },
      { id: 3, pid: 1, name: 'child2' },
      { id: 4, pid: 1, name: 'child3' },
      { id: 5, pid: 1, name: 'child4' }
    ]

    const result = arrayToTree(input)

    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(4)
    expect(result[0].children.map((c: any) => c.id)).toEqual([2, 3, 4, 5])
  })

  it('should preserve original item properties', () => {
    const input = [
      { id: 1, pid: null, name: 'root', extra: 'data', count: 42 },
      { id: 2, pid: 1, name: 'child', status: 'active' }
    ]

    const result = arrayToTree(input)

    expect(result[0].extra).toBe('data')
    expect(result[0].count).toBe(42)
    expect(result[0].children[0].status).toBe('active')
  })
})
