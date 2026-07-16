import { useState } from 'react'
import dayjs from 'dayjs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Calendar } from './Calendar'

function Controlled() {
  const [value, setValue] = useState('2026-07-15')
  return <Calendar onValueChange={setValue} value={value} />
}

describe('Calendar', () => {
  it('renders the selected month and selects a day', async () => {
    render(<Controlled />)
    expect(screen.getByRole('button', { name: '选择年份' })).toHaveTextContent('2026 年')

    await userEvent.click(screen.getByRole('button', { name: /2026年7月20日/ }))
    expect(screen.getByRole('button', { name: /2026年7月20日/ })).toHaveAttribute(
      'data-selected',
      'true',
    )
  })

  it('navigates to the previous month', async () => {
    render(<Controlled />)
    await userEvent.click(screen.getByRole('button', { name: '上个月' }))
    expect(screen.getByRole('button', { name: '选择月份' })).toHaveTextContent('6 月')
  })

  it('picks a year and month through the title buttons', async () => {
    render(<Controlled />)

    await userEvent.click(screen.getByRole('button', { name: '选择年份' }))
    await userEvent.click(screen.getByRole('button', { name: '2024' }))
    await userEvent.click(screen.getByRole('button', { name: '3月' }))

    expect(screen.getByRole('button', { name: '选择年份' })).toHaveTextContent('2024 年')
    expect(screen.getByRole('button', { name: '选择月份' })).toHaveTextContent('3 月')
  })

  it('supports a controlled visible month and reports month navigation', async () => {
    const onVisibleMonthChange = vi.fn()
    const { rerender } = render(
      <Calendar
        onValueChange={vi.fn()}
        onVisibleMonthChange={onVisibleMonthChange}
        value="2026-07-15"
        visibleMonth="2026-07-01"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '下个月' }))
    expect(onVisibleMonthChange).toHaveBeenCalledWith('2026-08-01')
    expect(screen.getByRole('button', { name: '选择月份' })).toHaveTextContent('7 月')

    rerender(
      <Calendar
        onValueChange={vi.fn()}
        onVisibleMonthChange={onVisibleMonthChange}
        value="2026-07-15"
        visibleMonth="2026-08-01"
      />,
    )
    expect(screen.getByRole('button', { name: '选择月份' })).toHaveTextContent('8 月')
  })

  it('offers a today action that selects today and returns to its month', async () => {
    const today = new Date()
    const todayValue = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
    const todayMonth = `${todayValue.slice(0, 7)}-01`
    const onValueChange = vi.fn()
    const onVisibleMonthChange = vi.fn()

    render(
      <Calendar
        onValueChange={onValueChange}
        onVisibleMonthChange={onVisibleMonthChange}
        showTodayAction
        todayActionLabel="回到今天"
        value="2025-01-10"
        visibleMonth="2025-01-01"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '回到今天' }))
    expect(onVisibleMonthChange).toHaveBeenCalledWith(todayMonth)
    expect(onValueChange).toHaveBeenCalledWith(todayValue)
  })

  it.each([
    ['max', { max: dayjs().subtract(1, 'day').format('YYYY-MM-DD') }],
    ['min', { min: dayjs().add(1, 'day').format('YYYY-MM-DD') }],
  ])('disables the today action when today violates %s', async (_boundary, range) => {
    const onValueChange = vi.fn()
    render(<Calendar {...range} onValueChange={onValueChange} showTodayAction />)

    const todayAction = screen.getByRole('button', { name: '今天' })
    expect(todayAction).toBeDisabled()
    await userEvent.click(todayAction)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('uses an ARIA grid with one roving day and supports calendar keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<Controlled />)

    const grid = screen.getByRole('grid', { name: '2026年7月' })
    expect(within(grid).getAllByRole('row')).toHaveLength(6)
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(42)
    expect(grid.querySelectorAll('button[tabindex="0"]')).toHaveLength(1)

    const selectedDay = screen.getByRole('button', { name: /2026年7月15日/ })
    expect(selectedDay).toHaveAttribute('tabindex', '0')
    expect(selectedDay.closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true')
    selectedDay.focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /2026年7月16日/ })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(selectedDay).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: /2026年7月22日/ })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(selectedDay).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: /2026年7月13日/ })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('button', { name: /2026年7月19日/ })).toHaveFocus()
    await user.keyboard('{PageDown}')
    expect(screen.getByRole('button', { name: /2026年8月19日/ })).toHaveFocus()
    await user.keyboard('{PageUp}')
    expect(screen.getByRole('button', { name: /2026年7月19日/ })).toHaveFocus()
    expect(document.querySelectorAll('.ods-calendar__grid button[tabindex="0"]')).toHaveLength(1)
  })

  it('marks dates and lets consumers provide a contextual accessible label', () => {
    render(
      <Calendar
        getDateAriaLabel={(date, state) => `${date}${state.isMarked ? '，有事件' : ''}`}
        isDateMarked={(date) => date === '2026-07-20'}
        layout="fluid"
        onValueChange={vi.fn()}
        value="2026-07-15"
        visibleMonth="2026-07-01"
      />,
    )

    const markedDate = screen.getByRole('button', { name: '2026-07-20，有事件' })
    expect(markedDate).toHaveAttribute('data-marked', 'true')
    expect(markedDate.querySelector('.ods-calendar__marker')).toBeInTheDocument()
    expect(markedDate.closest('.ods-calendar')).toHaveAttribute('data-layout', 'fluid')
  })
})
