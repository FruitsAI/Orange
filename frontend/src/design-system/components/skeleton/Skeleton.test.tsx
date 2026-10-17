import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('stays decorative and exposes animation and shape hooks', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Skeleton
        animation="pulse"
        data-testid="skeleton"
        height={32}
        ref={ref}
        shape="circle"
        width={32}
      />,
    )

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
    expect(skeleton).toHaveAttribute('data-animation', 'pulse')
    expect(skeleton).toHaveAttribute('data-shape', 'circle')
    expect(skeleton).toHaveStyle({ height: '32px', width: '32px' })
    expect(ref.current).toBe(skeleton)
  })
})
