import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import { DataList } from './DataList'
import dataListCss from './data-list.css?raw'

describe('DataList', () => {
  it('composes a semantic navigation list from shared row slots', () => {
    render(
      <DataList.Root aria-label="待处理收款" as="ol">
        <DataList.Item>
          <DataList.Link
            density="comfortable"
            icon={<i className="ri-arrow-right-s-line" />}
            markerTone="danger"
            to="/projects/42"
          >
            <DataList.Identity>
              <DataList.Primary>极光网站</DataList.Primary>
              <DataList.Secondary>山岚工作室</DataList.Secondary>
            </DataList.Identity>
            <DataList.Meta align="end" numeric>
              <DataList.Primary>¥12,345.60</DataList.Primary>
              <DataList.Secondary tone="danger">逾期2天</DataList.Secondary>
            </DataList.Meta>
          </DataList.Link>
        </DataList.Item>
      </DataList.Root>,
    )

    expect(screen.getByRole('list', { name: '待处理收款' }).tagName).toBe('OL')
    const link = screen.getByRole('link', { name: /极光网站/ })
    expect(link).toHaveAttribute('href', '/projects/42')
    expect(link).toHaveClass('ods-router-link', 'ods-data-list__link')
    expect(link).toHaveAttribute('data-marker-tone', 'danger')
    expect(screen.getByText('¥12,345.60').parentElement).toHaveAttribute('data-align', 'end')
    expect(screen.getByText('¥12,345.60').parentElement).toHaveAttribute('data-numeric', 'true')
    expect(screen.getByText('逾期2天')).toHaveAttribute('data-tone', 'danger')
  })

  it('exposes reusable responsive, numeric, emphasis, and meter cell contracts', () => {
    render(
      <DataList.Root aria-label="近期项目">
        <DataList.Item>
          <DataList.Link identityWidth="md" to="/projects/9">
            <DataList.Identity>
              <DataList.Primary title="未来展厅">未来展厅</DataList.Primary>
              <DataList.Secondary>橙子科技</DataList.Secondary>
            </DataList.Identity>
            <DataList.Cell emphasis="strong" hideBelow="sm" numeric width="sm">
              ¥100,000.00
            </DataList.Cell>
            <DataList.Cell hideBelow="sm" layout="meter" width="md">
              <span aria-hidden="true">meter</span>
              <DataList.Secondary>回款 75%</DataList.Secondary>
            </DataList.Cell>
          </DataList.Link>
        </DataList.Item>
      </DataList.Root>,
    )

    const amount = screen.getByText('¥100,000.00')
    expect(screen.getByRole('link', { name: /未来展厅/ })).toHaveAttribute(
      'data-identity-width',
      'md',
    )
    expect(amount).toHaveAttribute('data-emphasis', 'strong')
    expect(amount).toHaveAttribute('data-hide-below', 'sm')
    expect(amount).toHaveAttribute('data-numeric', 'true')
    expect(amount).toHaveAttribute('data-width', 'sm')
    expect(screen.getByText('回款 75%').parentElement).toHaveAttribute('data-layout', 'meter')
    expect(dataListCss).toMatch(/\[data-marker-tone='danger'\]/)
    expect(dataListCss).toMatch(/\[data-hide-below='sm'\]/)
    expect(dataListCss).toMatch(
      /\[data-layout='meter'\][\s\S]*grid-template-columns:\s*7rem 4\.25rem/,
    )
    expect(dataListCss).toContain('@media (max-width: 45rem)')
  })
})
