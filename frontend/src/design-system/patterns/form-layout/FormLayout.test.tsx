import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormActions, FormGrid, FormSection } from './FormLayout'

describe('FormLayout', () => {
  it('composes titled form sections, responsive grids, and action rows', () => {
    const { container } = render(
      <FormSection description="用于合同与发票。" title="基本信息">
        <FormGrid columns={2}>
          <input aria-label="项目名称" />
          <input aria-label="客户名称" />
        </FormGrid>
        <FormActions align="between">
          <button type="button">取消</button>
          <button type="submit">保存</button>
        </FormActions>
      </FormSection>,
    )

    expect(screen.getByRole('heading', { level: 2, name: '基本信息' })).toBeInTheDocument()
    expect(container.querySelector('.ods-form-grid')).toHaveAttribute('data-columns', '2')
    expect(container.querySelector('.ods-form-actions')).toHaveAttribute('data-align', 'between')
  })
})
