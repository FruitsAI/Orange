import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import EmberPanel, { type EmberPanelProps } from './EmberPanel'

const excludedModifierKeys: [
  'flat' extends keyof EmberPanelProps ? never : 'flat',
  'hover' extends keyof EmberPanelProps ? never : 'hover',
] = ['flat', 'hover']

describe('EmberPanel', () => {
  it('excludes legacy visual modifiers from its public type contract', () => {
    expect(excludedModifierKeys).toEqual(['flat', 'hover'])
  })

  it('applies the shared Ember surface and forwards card attributes', () => {
    render(
      <EmberPanel aria-label="财务面板" className="custom-panel" data-panel="income">
        面板内容
      </EmberPanel>,
    )

    const panel = screen.getByLabelText('财务面板')
    expect(panel).toHaveClass('glass-card', 'ember-panel', 'custom-panel')
    expect(panel).toHaveAttribute('data-panel', 'income')
    expect(panel).toHaveTextContent('面板内容')
  })

  it('preserves the no-padding option from GlassCard', () => {
    render(<EmberPanel noPadding>无内边距</EmberPanel>)

    expect(screen.getByText('无内边距')).toHaveClass('ember-panel', 'p-0')
  })
})
