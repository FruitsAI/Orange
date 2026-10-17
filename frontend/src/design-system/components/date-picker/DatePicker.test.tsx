import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from './DatePicker'
import { Field } from '../field'

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
    expect(document.querySelector('[data-slot="popover"] [data-selected="true"]')).toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: /2026年7月20日/ }))

    expect(onValueChange).toHaveBeenCalledWith('2026-07-20')
    expect(trigger).toHaveTextContent('2026/07/20')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('inherits label and required semantics from Field', async () => {
    render(
      <Field.Root required>
        <Field.Label>交付日期</Field.Label>
        <DatePicker onValueChange={() => undefined} />
      </Field.Root>,
    )

    const trigger = screen.getByRole('button', { name: '交付日期' })
    expect(trigger).toHaveAttribute('aria-required', 'true')
    await userEvent.click(screen.getByText('交付日期'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="popover"] [data-today="true"]')).toHaveFocus()
  })

  it('focuses today when no date is selected', async () => {
    render(<DatePicker onValueChange={() => undefined} />)

    await userEvent.click(screen.getByRole('button', { name: '选择日期' }))

    expect(document.querySelector('[data-slot="popover"] [data-today="true"]')).toHaveFocus()
  })

  it('moves through the calendar with arrow keys and selects the focused date', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ControlledDatePicker onValueChange={onValueChange} />)

    const trigger = screen.getByRole('button', { name: '选择日期' })
    await user.click(trigger)

    expect(screen.getByRole('button', { name: /2026年7月15日/ })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /2026年7月16日/ })).toHaveFocus()
    expect(document.querySelectorAll('.ods-calendar__grid button[tabindex="0"]')).toHaveLength(1)

    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenCalledWith('2026-07-16')
    expect(trigger).toHaveTextContent('2026/07/16')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
