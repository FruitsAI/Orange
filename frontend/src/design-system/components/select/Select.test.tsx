import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Select } from './Select'
import { Field } from '../field'

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
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('listbox')).toHaveLength(1)

    await userEvent.click(screen.getByRole('option', { name: '按季' }))
    expect(trigger).toHaveTextContent('按季')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('inherits label, required, and invalid semantics from Field', async () => {
    render(
      <Field.Root invalid required>
        <Field.Label>结算方式</Field.Label>
        <Select onValueChange={() => undefined} options={options} />
        <Field.Error>请选择结算方式</Field.Error>
      </Field.Root>,
    )

    const trigger = screen.getByRole('button', { name: '结算方式' })
    expect(trigger).toHaveAttribute('aria-required', 'true')
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAccessibleDescription('请选择结算方式')
    await userEvent.click(screen.getByText('结算方式'))
    expect(screen.getByRole('option', { name: '按月' })).toHaveFocus()
  })

  it('focuses the selected option, or the first enabled option when empty', async () => {
    const { rerender } = render(
      <Select
        aria-label="结算周期"
        onValueChange={() => undefined}
        options={options}
        value="quarterly"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '结算周期' }))
    expect(screen.getByRole('option', { name: '按季' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    rerender(<Select aria-label="结算周期" onValueChange={() => undefined} options={options} />)
    await userEvent.click(screen.getByRole('button', { name: '结算周期' }))
    expect(screen.getByRole('option', { name: '按月' })).toHaveFocus()
  })

  it('supports content-width triggers and option popovers', async () => {
    render(
      <Select
        aria-label="每页条数"
        onValueChange={() => undefined}
        options={options}
        value="monthly"
        width="content"
      />,
    )

    const trigger = screen.getByRole('button', { name: '每页条数' })
    expect(trigger).toHaveAttribute('data-width', 'content')

    await userEvent.click(trigger)
    expect(screen.getByRole('listbox').closest('.ods-select__popover')).toHaveAttribute(
      'data-width',
      'content',
    )
  })
})
