import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Select } from './Select'

const options = [
  { label: '按月', value: 'monthly' },
  { label: '按季', value: 'quarterly' },
  { label: '按年', value: 'yearly' },
]

function Controlled() {
  const [value, setValue] = useState<string>()
  return <Select aria-label="结算周期" onValueChange={setValue} options={options} value={value} />
}

describe('Select', () => {
  it('opens the listbox and selects an option', async () => {
    render(<Controlled />)
    const trigger = screen.getByRole('button', { name: '结算周期' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(screen.getByRole('option', { name: '按季' }))
    expect(trigger).toHaveTextContent('按季')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
