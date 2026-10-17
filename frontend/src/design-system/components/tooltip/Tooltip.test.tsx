import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tooltip } from './Tooltip'

describe('Tooltip', () => {
  it('opens on hover and links the trigger via aria-describedby', async () => {
    render(
      <Tooltip content="提示内容">
        <button type="button">触发器</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: '触发器' })
    expect(trigger).not.toHaveAttribute('aria-describedby')

    await userEvent.hover(trigger)

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('提示内容')
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)
  })
})
