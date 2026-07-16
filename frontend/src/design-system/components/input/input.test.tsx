import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import { Input, InputGroup, NativeSelect, TextArea } from './Input'
import inputCss from './input.css?raw'

describe('input primitives', () => {
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
