import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionHeader } from './SectionHeader'

describe('SectionHeader', () => {
  it('supports configurable heading hierarchy and trailing actions', () => {
    render(
      <SectionHeader
        actions={<button type="button">编辑</button>}
        description="最近 30 天"
        headingLevel={3}
        title="收款趋势"
      />,
    )

    expect(screen.getByRole('heading', { level: 3, name: '收款趋势' })).toBeInTheDocument()
    expect(screen.getByText('最近 30 天')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument()
  })
})
