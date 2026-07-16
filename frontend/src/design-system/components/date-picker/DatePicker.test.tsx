import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from './DatePicker'

function ControlledDatePicker({ onValueChange }: { onValueChange: (value: string) => void }) {
  const [value, setValue] = useState('2026-07-15')
  return (
    <DatePicker
      displayFormat="YYYY/MM/DD"
      onValueChange={(next) => {
        setValue(next)
        onValueChange(next)
      }}
      value={value}
    />
  )
}

describe('DatePicker', () => {
  it('opens its calendar, selects a date, updates the display, and closes', async () => {
    const onValueChange = vi.fn()
    render(<ControlledDatePicker onValueChange={onValueChange} />)

    const trigger = screen.getByRole('button', { name: '选择日期' })
    expect(trigger).toHaveTextContent('2026/07/15')

    await userEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '20' }))

    expect(onValueChange).toHaveBeenCalledWith('2026-07-20')
    expect(trigger).toHaveTextContent('2026/07/20')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
