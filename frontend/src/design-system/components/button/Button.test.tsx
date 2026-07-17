import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button, IconButton } from './Button'
import buttonCss from './button.css?raw'

describe('Button', () => {
  it('uses asymmetric semantic timing for interruptible press feedback', () => {
    const buttonRule = buttonCss.match(/\.ods-button\s*\{([^}]+)\}/)?.[1]
    const activeSelector = '.ods-button[data-variant]:active:not(:disabled)'
    const motionBeforeReducedMedia = buttonCss.split('@media (prefers-reduced-motion: reduce)')[0]
    const activeRule = buttonCss.match(
      /\.ods-button\[data-variant\]:active:not\(:disabled\)\s*\{([^}]+)\}/,
    )?.[1]
    const reducedMotionRule = buttonCss.match(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.ods-button\[data-variant\]:hover:not\(:disabled\),\s*\.ods-button\[data-variant\]:active:not\(:disabled\)\s*\{([^}]+)\}/,
    )?.[1]

    expect(buttonRule).toContain('--ods-button-transform-duration: var(--ods-duration-release)')
    expect(buttonRule).toContain(
      'transform var(--ods-button-transform-duration) var(--ods-ease-standard)',
    )
    expect(activeRule).toContain('--ods-button-transform-duration: var(--ods-duration-press)')
    expect(activeRule).toContain('transform: scale(0.97)')
    expect(activeRule).not.toContain('translateY')
    expect(motionBeforeReducedMedia.lastIndexOf(activeSelector)).toBeGreaterThan(
      motionBeforeReducedMedia.lastIndexOf(':hover:not(:disabled)'),
    )
    expect(reducedMotionRule).toContain('transform: none')
  })

  it('applies semantic variants, sizes, width, and native button props', () => {
    const onClick = vi.fn()
    const ref = createRef<HTMLButtonElement>()

    render(
      <Button
        autoHeight
        className="custom-action"
        fullWidth
        onClick={onClick}
        ref={ref}
        size="lg"
        tone="danger"
        variant="danger"
      >
        删除
      </Button>,
    )

    const button = screen.getByRole('button', { name: '删除' })
    expect(button).toHaveClass('ods-button', 'custom-action')
    expect(button).toHaveAttribute('data-auto-height', 'true')
    expect(button).toHaveAttribute('data-full-width', 'true')
    expect(button).toHaveAttribute('data-size', 'lg')
    expect(button).toHaveAttribute('data-tone', 'danger')
    expect(button).toHaveAttribute('data-variant', 'danger')
    expect(ref.current).toBe(button)

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('exposes pending state and prevents duplicate activation', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} pending>
        保存中
      </Button>,
    )

    const button = screen.getByRole('button', { name: '保存中' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('data-pending', 'true')
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('IconButton', () => {
  it('requires a visible accessibility label while keeping the icon decorative', () => {
    render(
      <IconButton label="关闭" variant="ghost">
        <i aria-hidden="true" className="ri-close-line" />
      </IconButton>,
    )

    const button = screen.getByRole('button', { name: '关闭' })
    expect(button).toHaveClass('ods-button', 'ods-icon-button')
    expect(button).toHaveAttribute('aria-label', '关闭')
  })
})
