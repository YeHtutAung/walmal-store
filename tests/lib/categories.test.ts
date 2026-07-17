import { describe, expect, it } from 'vitest'
import { findActiveCategoryBySlug, type Category } from '@/lib/api/categories'

const tree: Category[] = [
  { categoryId: '1', name: 'Boots', slug: 'boots', active: true, children: [] },
  { categoryId: '2', name: 'Electronics', slug: 'electronics', active: false, children: [
    { categoryId: '3', name: 'Old Child', slug: 'old-child', active: true, children: [] },
  ] },
]

describe('findActiveCategoryBySlug', () => {
  it('finds an active root by slug', () => {
    expect(findActiveCategoryBySlug(tree, 'boots')?.categoryId).toBe('1')
  })
  it('ignores inactive categories', () => {
    expect(findActiveCategoryBySlug(tree, 'electronics')).toBeNull()
  })
  it('searches children recursively (active only)', () => {
    expect(findActiveCategoryBySlug(tree, 'old-child')?.categoryId).toBe('3')
  })
  it('returns null for unknown slug', () => {
    expect(findActiveCategoryBySlug(tree, 'nope')).toBeNull()
  })
})
