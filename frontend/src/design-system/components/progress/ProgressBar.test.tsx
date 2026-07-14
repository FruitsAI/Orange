import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('exposes native progressbar aria values and clamps visual progress', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <ProgressBar
        label="回款进度"
        max={100}
        min={0}
        ref={ref}
        tone="success"
        value={120}
        valueLabel="已全部回款"
      />,
    )

    const progress = screen.getByRole('progressbar', { name: '回款进度' })
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(progress).toHaveAttribute('aria-valuenow', '100')
    expect(progress).toHaveAttribute('aria-valuetext', '已全部回款')
    expect(progress).toHaveAttribute('data-tone', 'success')
    expect(progress.querySelector('[data-slot="fill"]')).toHaveStyle({ width: '100%' })
    expect(ref.current).toBe(progress)
  })

  it('supports an indeterminate state without aria-valuenow', () => {
    render(<ProgressBar label="正在导入" />)

    const progress = screen.getByRole('progressbar', { name: '正在导入' })
    expect(progress).not.toHaveAttribute('aria-valuenow')
    expect(progress).toHaveAttribute('data-indeterminate', 'true')
  })
})
