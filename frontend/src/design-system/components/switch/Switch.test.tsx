import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Switch } from './Switch'

describe('Switch', () => {
  it('toggles through the native input with switch semantics', async () => {
    render(<Switch defaultChecked={false}>自动提醒</Switch>)

    const input = screen.getByRole('switch', { name: '自动提醒' })
    expect(input).not.toBeChecked()

    await userEvent.click(input)
    expect(input).toBeChecked()
  })
})
