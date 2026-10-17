import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { NumberInput } from './NumberInput'

function Controlled() {
  const [value, setValue] = useState(3)
  return <NumberInput max={5} min={1} onValueChange={setValue} value={value} />
}

describe('NumberInput', () => {
  it('steps within bounds via the increment and decrement buttons', async () => {
    render(<Controlled />)

    const field = screen.getByRole('spinbutton')
    await userEvent.click(screen.getByRole('button', { name: '增加' }))
    expect(field).toHaveValue(4)

    await userEvent.click(screen.getByRole('button', { name: '增加' }))
    expect(field).toHaveValue(5)
    expect(screen.getByRole('button', { name: '增加' })).toBeDisabled()
  })
})
