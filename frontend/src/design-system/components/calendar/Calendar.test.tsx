import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Calendar } from './Calendar'

function Controlled() {
  const [value, setValue] = useState('2026-07-15')
  return <Calendar onValueChange={setValue} value={value} />
}

describe('Calendar', () => {
  it('renders the selected month and selects a day', async () => {
    render(<Controlled />)
    expect(screen.getByRole('button', { name: '选择年份' })).toHaveTextContent('2026 年')
    expect(screen.getByRole('button', { name: '选择月份' })).toHaveTextContent('7 月')

    await userEvent.click(screen.getByRole('button', { name: '20' }))
    const selected = screen.getByRole('button', { name: '20' })
    expect(selected).toHaveAttribute('data-selected', 'true')
  })

  it('navigates to the previous month', async () => {
    render(<Controlled />)
    await userEvent.click(screen.getByRole('button', { name: '上个月' }))
    expect(screen.getByRole('button', { name: '选择年份' })).toHaveTextContent('2026 年')
    expect(screen.getByRole('button', { name: '选择月份' })).toHaveTextContent('6 月')
  })
})
