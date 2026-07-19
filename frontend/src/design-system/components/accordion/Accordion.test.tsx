import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Accordion } from './Accordion'

describe('Accordion', () => {
  it('expands one panel at a time by default', async () => {
    render(
      <Accordion defaultValue={['a']}>
        <Accordion.Item itemKey="a" title="第一项">
          内容一
        </Accordion.Item>
        <Accordion.Item itemKey="b" title="第二项">
          内容二
        </Accordion.Item>
      </Accordion>,
    )

    expect(screen.getByRole('button', { name: '第一项' })).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(screen.getByRole('button', { name: '第二项' }))

    expect(screen.getByRole('button', { name: '第一项' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: '第二项' })).toHaveAttribute('aria-expanded', 'true')
  })
})
