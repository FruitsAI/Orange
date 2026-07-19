import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '../button'
import { ButtonGroup } from './ButtonGroup'

describe('ButtonGroup', () => {
  it('groups buttons with the requested orientation and forwards native props and ref', () => {
    const ref = createRef<HTMLDivElement>()

    render(
      <ButtonGroup aria-label="视图切换" className="custom-group" orientation="vertical" ref={ref}>
        <Button>列表</Button>
        <Button>网格</Button>
      </ButtonGroup>,
    )

    const group = screen.getByRole('group', { name: '视图切换' })
    expect(group).toHaveClass('ods-button-group', 'custom-group')
    expect(group).toHaveAttribute('data-orientation', 'vertical')
    expect(ref.current).toBe(group)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
