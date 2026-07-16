import { describe, expect, it } from 'vitest'
import { useToastStore } from './useToast'

describe('useToastStore compatibility actions', () => {
  it('does not expose a stale duplicate toast collection', () => {
    expect(useToastStore.getState()).not.toHaveProperty('toasts')
    expect(useToastStore.getState()).toMatchObject({
      add: expect.any(Function),
      error: expect.any(Function),
      info: expect.any(Function),
      remove: expect.any(Function),
      success: expect.any(Function),
      warning: expect.any(Function),
    })
  })
})
