import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CheckboxGroup } from './CheckboxGroup'

function Controlled() {
  const [value, setValue] = useState<string[]>(['email'])
  return (
    <CheckboxGroup label="通知渠道" onValueChange={setValue} value={value}>
      <CheckboxGroup.Item value="email">邮件</CheckboxGroup.Item>
      <CheckboxGroup.Item value="sms">短信</CheckboxGroup.Item>
    </CheckboxGroup>
  )
}

describe('CheckboxGroup', () => {
  it('toggles values in the group array', async () => {
    render(<Controlled />)
    const email = screen.getByRole('checkbox', { name: '邮件' })
    const sms = screen.getByRole('checkbox', { name: '短信' })
    expect(email).toBeChecked()
    expect(sms).not.toBeChecked()

    await userEvent.click(sms)
    expect(sms).toBeChecked()

    await userEvent.click(email)
    expect(email).not.toBeChecked()
  })
})
