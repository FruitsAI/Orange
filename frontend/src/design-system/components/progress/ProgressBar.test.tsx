import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'
import progressCss from './progress.css?raw'

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

  it('owns the optional determinate reveal motion', () => {
    render(<ProgressBar label="项目进度" motion="reveal" value={62} />)

    expect(screen.getByRole('progressbar', { name: '项目进度' })).toHaveAttribute(
      'data-motion',
      'reveal',
    )
    expect(progressCss).toMatch(
      /\.ods-progress\[data-motion='reveal'\][^{]+\{[\s\S]*animation:\s*ods-progress-reveal/,
    )
    expect(progressCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*data-motion='reveal'[\s\S]*animation:\s*none/,
    )
  })
})
