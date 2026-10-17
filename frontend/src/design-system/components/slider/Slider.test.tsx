import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Slider } from './Slider'

function Controlled() {
  const [value, setValue] = useState(40)
  return <Slider label="音量" max={100} min={0} onValueChange={setValue} step={10} value={value} />
}

describe('Slider', () => {
  it('exposes slider semantics and steps with the keyboard', async () => {
    render(<Controlled />)
    const slider = screen.getByRole('slider', { name: '音量' })
    expect(slider).toHaveAttribute('aria-valuenow', '40')

    slider.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(slider).toHaveAttribute('aria-valuenow', '50')

    await userEvent.keyboard('{Home}')
    expect(slider).toHaveAttribute('aria-valuenow', '0')

    await userEvent.keyboard('{End}')
    expect(slider).toHaveAttribute('aria-valuenow', '100')
  })
})
