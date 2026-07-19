import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card, Surface } from './Surface'
import surfaceCss from './surface.css?raw'

describe('Surface', () => {
  it('renders a semantic material surface with forwarded native attributes', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Surface
        aria-label="同步面板"
        focusWithin
        padding="lg"
        ref={ref}
        tone="success"
        variant="glass"
      >
        内容
      </Surface>,
    )

    const surface = screen.getByLabelText('同步面板')
    expect(surface).toHaveClass('ods-surface')
    expect(surface).toHaveAttribute('data-focus-within', 'true')
    expect(surface).toHaveAttribute('data-padding', 'lg')
    expect(surface).toHaveAttribute('data-tone', 'success')
    expect(surface).toHaveAttribute('data-variant', 'glass')
    expect(ref.current).toBe(surface)
    expect(surfaceCss).toMatch(/\.ods-surface\[data-focus-within='true'\]:focus-within/)
  })

  it('supports semantic polymorphic roots and tokenized radii', () => {
    const ref = createRef<HTMLElement>()
    render(
      <Surface
        as="header"
        aria-label="应用顶栏"
        className="test-surface"
        padding="none"
        radius="shell"
        ref={ref}
        variant="glass"
      >
        顶栏内容
      </Surface>,
    )

    const surface = screen.getByRole('banner', { name: '应用顶栏' })
    expect(surface).toHaveClass('ods-surface')
    expect(surface).toHaveClass('ods-surface', 'test-surface')
    expect(surface).toHaveAttribute('data-radius', 'shell')
    expect(ref.current).toBe(surface)
  })

  it('owns the themed brand treatment for narrative product surfaces', () => {
    render(
      <Surface as="section" aria-label="品牌概览" padding="none" radius="shell" variant="brand">
        概览内容
      </Surface>,
    )

    const surface = screen.getByRole('region', { name: '品牌概览' })
    expect(surface).toHaveAttribute('data-variant', 'brand')
    expect(surface).toHaveAttribute('data-radius', 'shell')
    expect(surfaceCss).toMatch(/\.ods-surface\[data-variant='brand'\]/)
    expect(surfaceCss).toMatch(/background:\s*var\(--ods-gradient-brand-surface\)/)
    expect(surfaceCss).toMatch(/box-shadow:\s*var\(--ods-shadow-brand-surface\)/)
  })

  it('rejects custom React components as polymorphic roots', () => {
    const CustomRoot = ({ className }: { className?: string }) => <div className={className} />

    // @ts-expect-error Surface deliberately supports intrinsic elements only.
    const unsupportedSurfaceProps: Parameters<typeof Surface>[0] = { as: CustomRoot }
    // @ts-expect-error Card.Root deliberately supports intrinsic elements only.
    const unsupportedCardProps: Parameters<typeof Card.Root>[0] = { as: CustomRoot }

    expect(() => Surface(unsupportedSurfaceProps)).toThrow(/intrinsic HTML element names/)
    expect(() => Card.Root(unsupportedCardProps)).toThrow(/intrinsic HTML element names/)
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

  it('supports semantic polymorphic roots without losing the card contract', () => {
    const ref = createRef<HTMLElement>()
    render(
      <Card.Root as="article" aria-label="回款指标" ref={ref} variant="secondary">
        指标内容
      </Card.Root>,
    )

    const card = screen.getByRole('article', { name: '回款指标' })
    expect(card).toHaveClass('ods-card')
    expect(card).toHaveAttribute('data-variant', 'secondary')
    expect(ref.current).toBe(card)
  })

  it('owns reusable card orientation, spacing, and status tone', () => {
    render(
      <Card.Root aria-label="待同步数据" gap="sm" orientation="horizontal" tone="warning">
        待同步 3 项
      </Card.Root>,
    )

    const card = screen.getByLabelText('待同步数据')
    expect(card).toHaveAttribute('data-gap', 'sm')
    expect(card).toHaveAttribute('data-orientation', 'horizontal')
    expect(card).toHaveAttribute('data-tone', 'warning')
    expect(surfaceCss.indexOf(".ods-card[data-tone='warning']")).toBeGreaterThan(
      surfaceCss.indexOf(".ods-card[data-variant='tertiary']"),
    )
  })

  it('exposes an explicit pressable state for polymorphic interactive cards', () => {
    render(
      <Card.Root as="button" aria-label="打开 GitHub" pressable type="button">
        GitHub
      </Card.Root>,
    )

    const card = screen.getByRole('button', { name: '打开 GitHub' })
    expect(card).toHaveAttribute('data-pressable', 'true')
    expect(card).toHaveAttribute('type', 'button')
    expect(surfaceCss).toMatch(/\.ods-card\[data-pressable='true'\]:focus-visible/)
    expect(surfaceCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })
})
