import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Table } from './Table'

describe('Table', () => {
  it('composes an accessible table and exposes sticky, selected, and alignment states', () => {
    const ref = createRef<HTMLTableElement>()

    render(
      <Table.Root
        aria-label="项目回款"
        className="custom-table"
        ref={ref}
        stickyHeader
        visuallyHidden
        wrapperClassName="custom-table-scroll"
      >
        <Table.Header>
          <Table.Row>
            <Table.Column>项目</Table.Column>
            <Table.Column align="end">金额</Table.Column>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row selected>
            <Table.Cell>Orange</Table.Cell>
            <Table.Cell align="end">¥100</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>,
    )

    const table = screen.getByRole('table', { name: '项目回款' })
    const amountColumn = screen.getByRole('columnheader', { name: '金额' })
    const amountCell = screen.getByRole('cell', { name: '¥100' })
    const selectedRow = amountCell.closest('tr')

    expect(table).toHaveClass('ods-table', 'custom-table')
    expect(table).toHaveAttribute('data-sticky', 'true')
    expect(table.parentElement).toHaveAttribute('data-slot', 'scroll')
    expect(table.parentElement).toHaveClass('ods-sr-only', 'custom-table-scroll')
    expect(ref.current).toBe(table)
    expect(amountColumn).toHaveAttribute('data-align', 'end')
    expect(amountColumn).toHaveAttribute('scope', 'col')
    expect(amountCell).toHaveAttribute('data-align', 'end')
    expect(selectedRow).toHaveAttribute('aria-selected', 'true')
    expect(selectedRow).toHaveAttribute('data-selected', 'true')
  })

  it('owns sticky columns and visual state for rows with nested accessible actions', () => {
    const onClick = vi.fn()
    render(
      <Table.Root aria-label="项目列表">
        <Table.Header>
          <Table.Row>
            <Table.Column>项目</Table.Column>
            <Table.Column sticky="end">操作</Table.Column>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row interactive onClick={onClick}>
            <Table.Cell>Orange</Table.Cell>
            <Table.Cell sticky="end">编辑</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>,
    )

    const row = screen.getByRole('cell', { name: 'Orange' }).closest('tr')!
    expect(row).toHaveAttribute('data-interactive', 'true')
    expect(row).not.toHaveAttribute('tabindex')
    expect(screen.getByRole('columnheader', { name: '操作' })).toHaveAttribute('data-sticky', 'end')
    expect(screen.getByRole('cell', { name: '编辑' })).toHaveAttribute('data-sticky', 'end')

    fireEvent.click(row)
    expect(onClick).toHaveBeenCalledOnce()
  })
})
