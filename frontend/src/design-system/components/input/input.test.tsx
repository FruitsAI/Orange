import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import { Input, InputGroup, NativeSelect, TextArea } from './Input'
import inputCss from './input.css?raw'

describe('input primitives', () => {
  it('keeps autofill colors stable without a long-running pseudo-animation', () => {
    const autofillRule = inputCss.match(
      /\.ods-input:-webkit-autofill,\s*\.ods-input:-webkit-autofill:hover,\s*\.ods-input:-webkit-autofill:focus,\s*\.ods-input:-webkit-autofill:active\s*\{([^}]+)\}/,
    )?.[1]
    const prefixedMask = autofillRule?.match(/-webkit-box-shadow:\s*([^;]+);/)?.[1]
    const standardMask = autofillRule?.match(/\n\s+box-shadow:\s*([^;]+);/)?.[1]

    expect(autofillRule).toContain('-webkit-text-fill-color: var(--ods-color-fg-default)')
    expect(autofillRule).toContain('caret-color: var(--ods-color-fg-default)')
    expect(prefixedMask).toBe('0 0 0 1000px var(--ods-color-bg-surface) inset')
    expect(standardMask).toBe(prefixedMask)
    expect(autofillRule).toContain('transition: none')
    expect(inputCss).not.toContain('9999s')
    expect(inputCss).not.toMatch(/transition[^;]*\b\d{4,}s\b/)
  })

  it('keeps focus feedback immediate and only crossfades hover backgrounds', () => {
    const inputFamilyRule = inputCss.match(
      /\.ods-input,\s*\.ods-textarea,\s*\.ods-native-select\s*\{([^}]+)\}/,
    )?.[1]
    const inputGroupRule = inputCss.match(/\.ods-input-group\s*\{([^}]+)\}/)?.[1]
    const focusRule = inputCss.match(
      /\.ods-input:focus-visible,\s*\.ods-textarea:focus-visible,\s*\.ods-native-select:focus-visible,\s*\.ods-input-group:focus-within\s*\{([^}]+)\}/,
    )?.[1]
    const transitionValue = (rule: string | undefined) =>
      rule
        ?.match(/transition:\s*([\s\S]*?);/)?.[1]
        .replace(/\s+/g, ' ')
        .trim()

    expect(transitionValue(inputFamilyRule)).toBe(
      'background-color var(--ods-duration-instant) var(--ods-ease-standard)',
    )
    expect(transitionValue(inputGroupRule)).toBe(
      'background-color var(--ods-duration-instant) var(--ods-ease-standard)',
    )
    expect(focusRule).toContain('transition: none')
  })

  it('only enables input-family hover feedback for fine pointers', () => {
    const finePointerMedia = inputCss.match(
      /@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*?\n\}/,
    )?.[0]
    const cssOutsideFinePointerMedia = inputCss.replace(finePointerMedia ?? '', '')
    const hoverSelectors = [
      '.ods-input:hover:not(:disabled)',
      '.ods-textarea:hover:not(:disabled)',
      '.ods-native-select:hover:not(:disabled)',
    ]

    expect(finePointerMedia).toBeDefined()
    for (const selector of hoverSelectors) {
      expect(finePointerMedia).toContain(selector)
      expect(cssOutsideFinePointerMedia).not.toContain(selector)
    }
  })

  it('forwards refs and native props while exposing a size contract', () => {
    const ref = createRef<HTMLInputElement>()
    const onChange = vi.fn()
    render(
      <Input
        aria-label="项目名称"
        autoComplete="organization"
        data-testid="input"
        onChange={onChange}
        ref={ref}
        size="lg"
      />,
    )

    const input = screen.getByTestId('input')
    expect(ref.current).toBe(input)
    expect(input).toHaveAttribute('autocomplete', 'organization')
    expect(input).toHaveAttribute('data-size', 'lg')
    expect(input).toHaveClass('ods-input')
  })

  it('composes start and end content without hiding the native input', () => {
    render(
      <InputGroup endContent={<span>.00</span>} startContent={<span>¥</span>}>
        <Input aria-label="金额" />
      </InputGroup>,
    )

    expect(screen.getByText('¥').closest('[data-slot]')).toHaveAttribute(
      'data-slot',
      'start-content',
    )
    expect(screen.getByText('.00').closest('[data-slot]')).toHaveAttribute(
      'data-slot',
      'end-content',
    )
    expect(screen.getByRole('textbox', { name: '金额' })).toBeInTheDocument()
  })

  it('owns password typography inside the input primitive', () => {
    render(<Input aria-label="密码" type="password" />)

    expect(screen.getByLabelText('密码')).toHaveAttribute('type', 'password')
    expect(inputCss).toMatch(/\.ods-input\[type='password'\]\s*\{[\s\S]*letter-spacing:\s*0\.12em/)
  })

  it('provides textarea and native select variants with forwarded native behavior', () => {
    render(
      <>
        <TextArea aria-label="备注" rows={4} size="sm" />
        <NativeSelect aria-label="状态" defaultValue="active" size="md">
          <option value="active">进行中</option>
        </NativeSelect>
      </>,
    )

    expect(screen.getByRole('textbox', { name: '备注' })).toHaveAttribute('rows', '4')
    expect(screen.getByRole('textbox', { name: '备注' })).toHaveAttribute('data-size', 'sm')
    expect(screen.getByRole('combobox', { name: '状态' })).toHaveValue('active')
    expect(screen.getByRole('combobox', { name: '状态' })).toHaveClass('ods-native-select')
  })
})
