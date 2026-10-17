import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import { Radio, RadioGroup } from './RadioGroup'

describe('RadioGroup', () => {
  it('uses fieldset and legend semantics for a controlled native radio group', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <RadioGroup onValueChange={onValueChange} value="month">
        <RadioGroup.Legend>统计周期</RadioGroup.Legend>
        <Radio value="week">周</Radio>
        <Radio value="month">月</Radio>
      </RadioGroup>,
    )

    const group = screen.getByRole('group', { name: '统计周期' })
    const week = screen.getByRole('radio', { name: '周' })
    const month = screen.getByRole('radio', { name: '月' })
    expect(group.tagName).toBe('FIELDSET')
    expect(month).toBeChecked()
    expect(week).toHaveAttribute('name', month.getAttribute('name'))

    await user.click(week)
    expect(onValueChange).toHaveBeenCalledWith('week')
  })

  it('disables all radios through the native fieldset contract', () => {
    render(
      <RadioGroup disabled onValueChange={() => {}} value="auto">
        <RadioGroup.Legend>主题</RadioGroup.Legend>
        <Radio value="auto">自动</Radio>
      </RadioGroup>,
    )

    expect(screen.getByRole('group', { name: '主题' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: '自动' })).toBeDisabled()
  })

  it('provides a shared responsive card selection variant', () => {
    render(
      <RadioGroup columns={2} onValueChange={() => {}} value="dark">
        <RadioGroup.Legend>主题</RadioGroup.Legend>
        <Radio value="light" variant="card">
          亮色
        </Radio>
        <Radio value="dark" variant="card">
          深色
        </Radio>
      </RadioGroup>,
    )

    const group = screen.getByRole('group', { name: '主题' })
    const lightCard = screen.getByRole('radio', { name: '亮色' }).closest('label')
    const darkCard = screen.getByRole('radio', { name: '深色' }).closest('label')

    expect(group).toHaveAttribute('data-columns', '2')
    expect(lightCard).toHaveAttribute('data-variant', 'card')
    expect(lightCard).not.toHaveAttribute('data-selected')
    expect(darkCard).toHaveAttribute('data-selected', 'true')
  })
})
