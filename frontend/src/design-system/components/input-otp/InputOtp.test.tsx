import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { InputOtp } from './InputOtp'

function Controlled() {
  const [value, setValue] = useState('')
  return <InputOtp length={4} onValueChange={setValue} value={value} />
}

describe('InputOtp', () => {
  it('accepts digits and advances focus, rejecting non-numeric input', async () => {
    render(<Controlled />)
    const slots = screen.getAllByRole('textbox')
    expect(slots).toHaveLength(4)

    slots[0].focus()
    await userEvent.keyboard('1')
    expect(slots[0]).toHaveValue('1')
    expect(slots[1]).toHaveFocus()

    await userEvent.keyboard('a')
    expect(slots[1]).toHaveValue('')
  })
})
