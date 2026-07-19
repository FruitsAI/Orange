import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/render'
import { Tabs } from './index'

const renderTabs = (onValueChange = vi.fn()) =>
  render(
    <Tabs.Root onValueChange={onValueChange} value="overview">
      <Tabs.List aria-label="项目视图">
        <Tabs.Tab value="overview">概览</Tabs.Tab>
        <Tabs.Tab value="activity">动态</Tabs.Tab>
        <Tabs.Tab disabled value="archive">
          归档
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">概览内容</Tabs.Panel>
      <Tabs.Panel value="activity">动态内容</Tabs.Panel>
      <Tabs.Panel value="archive">归档内容</Tabs.Panel>
    </Tabs.Root>,
  )

describe('Tabs', () => {
  it('connects controlled tabs and panels with stable ARIA relationships', () => {
    renderTabs()

    const overview = screen.getByRole('tab', { name: '概览' })
    const overviewPanel = screen.getByRole('tabpanel', { name: '概览' })
    const activityPanel = screen.getByText('动态内容').closest('[role="tabpanel"]')

    expect(overview).toHaveAttribute('aria-selected', 'true')
    expect(overview).toHaveAttribute('aria-controls', overviewPanel.id)
    expect(overviewPanel).toHaveAttribute('aria-labelledby', overview.id)
    expect(activityPanel).toHaveAttribute('hidden')
  })

  it('supports ArrowLeft, ArrowRight, Home, and End without focusing disabled tabs', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    renderTabs(onValueChange)
    const overview = screen.getByRole('tab', { name: '概览' })
    const activity = screen.getByRole('tab', { name: '动态' })

    overview.focus()
    await user.keyboard('{ArrowRight}')
    expect(activity).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith('activity')

    await user.keyboard('{End}')
    expect(activity).toHaveFocus()

    await user.keyboard('{Home}')
    expect(overview).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(activity).toHaveFocus()
  })

  it('uses ArrowUp and ArrowDown for a vertical tab list', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Tabs.Root onValueChange={onValueChange} value="overview">
        <Tabs.List aria-label="设置分类" orientation="vertical">
          <Tabs.Tab value="overview">概览</Tabs.Tab>
          <Tabs.Tab value="activity">动态</Tabs.Tab>
          <Tabs.Tab disabled value="archive">
            归档
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">概览内容</Tabs.Panel>
        <Tabs.Panel value="activity">动态内容</Tabs.Panel>
      </Tabs.Root>,
    )
    const overview = screen.getByRole('tab', { name: '概览' })
    const activity = screen.getByRole('tab', { name: '动态' })

    overview.focus()
    await user.keyboard('{ArrowDown}')
    expect(activity).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith('activity')

    await user.keyboard('{ArrowUp}')
    expect(overview).toHaveFocus()
    expect(onValueChange).toHaveBeenLastCalledWith('overview')
  })

  it('exposes a shared navigation-list treatment for settings sidebars', () => {
    render(
      <Tabs.Root onValueChange={() => {}} value="profile">
        <Tabs.List aria-label="设置分类" orientation="vertical" variant="navigation">
          <Tabs.Tab value="profile">个人信息</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="profile">个人信息内容</Tabs.Panel>
      </Tabs.Root>,
    )

    expect(screen.getByRole('tablist', { name: '设置分类' })).toHaveAttribute(
      'data-variant',
      'navigation',
    )
  })

  it('exposes the top-navigation accent treatment for compact period controls', () => {
    render(
      <Tabs.Root onValueChange={() => {}} value="month">
        <Tabs.List aria-label="趋势周期" variant="accent">
          <Tabs.Tab value="week">周</Tabs.Tab>
          <Tabs.Tab value="month">月</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="month">月度趋势</Tabs.Panel>
      </Tabs.Root>,
    )

    expect(screen.getByRole('tablist', { name: '趋势周期' })).toHaveAttribute(
      'data-variant',
      'accent',
    )
    expect(screen.getByRole('tab', { name: '月' })).toHaveAttribute('aria-selected', 'true')
  })

  it('exposes a responsive rail treatment for settings navigation', () => {
    render(
      <Tabs.Root onValueChange={() => {}} value="profile">
        <Tabs.List aria-label="设置分类" orientation="vertical" variant="rail">
          <Tabs.Tab value="profile">个人信息</Tabs.Tab>
          <Tabs.Tab value="security">安全设置</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="profile">个人资料</Tabs.Panel>
      </Tabs.Root>,
    )

    expect(screen.getByRole('tablist', { name: '设置分类' })).toHaveAttribute(
      'data-variant',
      'rail',
    )
    expect(screen.getByRole('tablist', { name: '设置分类' })).toHaveAttribute(
      'aria-orientation',
      'vertical',
    )
  })
})
