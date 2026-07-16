import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Table } from './Table'

describe('Table', () => {
  it('composes an accessible table and exposes sticky, selected, and alignment states', () => {
    const ref = createRef<HTMLTableElement>()

    render(
      <Table.Root aria-label="项目回款" className="custom-table" ref={ref} stickyHeader>
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
    expect(ref.current).toBe(table)
    expect(amountColumn).toHaveAttribute('data-align', 'end')
    expect(amountColumn).toHaveAttribute('scope', 'col')
    expect(amountCell).toHaveAttribute('data-align', 'end')
    expect(selectedRow).toHaveAttribute('aria-selected', 'true')
    expect(selectedRow).toHaveAttribute('data-selected', 'true')
  })
})
