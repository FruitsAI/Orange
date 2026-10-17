import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/render'
import { Input } from '../input'
import { Field } from './index'

describe('Field', () => {
  it('connects label, description, error, required, and invalid state to its control', () => {
    render(
      <Field.Root invalid required>
        <Field.Label>邮箱</Field.Label>
        <Input name="email" />
        <Field.Description>用于接收项目提醒</Field.Description>
        <Field.Error>邮箱格式不正确</Field.Error>
      </Field.Root>,
    )

    const input = screen.getByRole('textbox', { name: '邮箱' })
    const description = screen.getByText('用于接收项目提醒')
    const error = screen.getByText('邮箱格式不正确')

    expect(input).toBeRequired()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', `${description.id} ${error.id}`)
    expect(error).toHaveAttribute('role', 'alert')
  })

  it('preserves explicit ids and external descriptions', () => {
    render(
      <>
        <span id="external-help">外部帮助</span>
        <Field.Root id="account-field">
          <Field.Label>账号</Field.Label>
          <Input aria-describedby="external-help" />
          <Field.Description>请输入账号</Field.Description>
        </Field.Root>
      </>,
    )

    const input = screen.getByRole('textbox', { name: '账号' })
    expect(input).toHaveAttribute('id', 'account-field-control')
    expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual([
      'external-help',
      'account-field-description',
    ])
    expect(input).not.toHaveAttribute('aria-invalid')
  })
})
