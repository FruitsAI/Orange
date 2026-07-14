import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card, Surface } from './Surface'

describe('Surface', () => {
  it('renders a semantic material surface with forwarded native attributes', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Surface aria-label="同步面板" padding="lg" ref={ref} variant="glass">
        内容
      </Surface>,
    )

    const surface = screen.getByLabelText('同步面板')
    expect(surface).toHaveClass('ods-surface')
    expect(surface).toHaveAttribute('data-padding', 'lg')
    expect(surface).toHaveAttribute('data-variant', 'glass')
    expect(ref.current).toBe(surface)
  })
})

describe('Card', () => {
  it('provides HeroUI-style compound slots', () => {
    render(
      <Card.Root aria-label="项目摘要" variant="secondary">
        <Card.Header>
          <Card.Title>近期项目</Card.Title>
          <Card.Description>最近创建的项目</Card.Description>
        </Card.Header>
        <Card.Content>内容</Card.Content>
        <Card.Footer>查看全部</Card.Footer>
      </Card.Root>,
    )

    const card = screen.getByLabelText('项目摘要')
    expect(card).toHaveClass('ods-card')
    expect(card).toHaveAttribute('data-variant', 'secondary')
    expect(screen.getByRole('heading', { name: '近期项目', level: 3 })).toHaveAttribute(
      'data-slot',
      'title',
    )
    expect(screen.getByText('最近创建的项目')).toHaveAttribute('data-slot', 'description')
    expect(screen.getByText('内容')).toHaveAttribute('data-slot', 'content')
    expect(screen.getByText('查看全部')).toHaveAttribute('data-slot', 'footer')
  })
})
