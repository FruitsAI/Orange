import { useEffect } from 'react'
import { act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { render, screen, waitFor } from '@/test/render'
import SettingsView from './SettingsView'

const adminUser: User = {
  avatar: '',
  department: '产品部',
  email: 'admin@example.com',
  id: 1,
  name: '管理员',
  phone: '13800138000',
  position: '负责人',
  role: 'admin',
  status: 1,
  username: 'admin',
}

const memberUser: User = {
  ...adminUser,
  id: 2,
  name: '普通用户',
  role: 'user',
  username: 'member',
}

function RouteProbe({ onNavigate }: { onNavigate?: (navigate: NavigateFunction) => void }) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    onNavigate?.(navigate)
  }, [navigate, onNavigate])

  return <output data-testid="settings-location">{`${location.pathname}${location.search}`}</output>
}

describe('SettingsView', () => {
  const originalChangePassword = useAuthStore.getState().changePassword
  const originalRefreshUser = useAuthStore.getState().refreshUser
  const originalUpdateProfile = useAuthStore.getState().updateProfile
  const originalUser = useAuthStore.getState().user

  beforeEach(() => {
    window.localStorage.clear()
    useThemeStore.setState({ effectiveTheme: 'light', theme: 'auto' })
    useAuthStore.setState({
      refreshUser: vi.fn().mockResolvedValue(undefined),
      user: adminUser,
    })
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduced-motion'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    useAuthStore.setState({
      changePassword: originalChangePassword,
      refreshUser: originalRefreshUser,
      updateProfile: originalUpdateProfile,
      user: originalUser,
    })
    vi.unstubAllGlobals()
  })

  it('uses design-system tabs and radio controls that stay synchronized with the theme store', async () => {
    const user = userEvent.setup()
    render(<SettingsView />, { initialEntries: ['/settings?tab=appearance'] })

    const automatic = screen.getByRole('radio', { name: '跟随系统' })
    const light = screen.getByRole('radio', { name: '亮色' })
    const dark = screen.getByRole('radio', { name: '深色' })
    expect(screen.getByRole('tablist', { name: '设置分类' })).toHaveClass('ods-tabs__list')
    expect(screen.getByRole('tablist', { name: '设置分类' })).toHaveAttribute(
      'data-variant',
      'navigation',
    )
    expect(automatic.closest('.ods-radio')).not.toBeNull()
    expect(automatic.closest('.ods-radio')).toHaveAttribute('data-variant', 'card')
    expect(automatic).toBeChecked()
    expect(light).not.toBeChecked()
    expect(dark).not.toBeChecked()

    await user.click(dark)
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(dark).toBeChecked()
    expect(window.localStorage.getItem('theme')).toBe('dark')
  })

  it('composes profile actions and fields from Orange Design System', () => {
    render(<SettingsView />, { initialEntries: ['/settings?tab=profile'] })

    expect(screen.getByRole('button', { name: '保存更改' })).toHaveClass('ods-button')
    expect(screen.getByRole('textbox', { name: '姓名' })).toHaveClass('ods-input')
    expect(screen.getByRole('textbox', { name: '部门' }).closest('.ods-field')).not.toBeNull()
  })

  it('derives the authorized active tab from the URL and follows same-route history', async () => {
    const user = userEvent.setup()
    let routeNavigate: NavigateFunction | null = null
    const captureNavigate = (navigate: NavigateFunction) => {
      routeNavigate = navigate
    }
    render(
      <>
        <SettingsView />
        <RouteProbe onNavigate={captureNavigate} />
      </>,
      { initialEntries: ['/settings?tab=profile'] },
    )

    await user.click(screen.getByRole('tab', { name: '关于' }))
    expect(screen.getByTestId('settings-location')).toHaveTextContent('/settings?tab=about')
    expect(screen.getByRole('tab', { name: '关于' })).toHaveAttribute('aria-selected', 'true')

    act(() => routeNavigate?.(-1))
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: '个人信息' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )

    act(() => routeNavigate?.('/settings?tab=security'))
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: '安全设置' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )
  })

  it('rejects role-restricted tabs without rewriting the requested URL', () => {
    useAuthStore.setState({ user: memberUser })
    render(
      <>
        <SettingsView />
        <RouteProbe />
      </>,
      { initialEntries: ['/settings?tab=users'] },
    )

    expect(screen.queryByRole('tab', { name: '用户管理' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '个人信息' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('settings-location')).toHaveTextContent('/settings?tab=users')
  })

  it('preserves a dirty profile through a late refresh and resets it for a new identity', async () => {
    vi.useFakeTimers()
    const refreshedUser = { ...adminUser, name: '服务端姓名', position: '服务端职位' }
    let completeRefresh = () => {}
    const refreshUser = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          completeRefresh = () => {
            useAuthStore.setState({ user: refreshedUser })
            resolve()
          }
        }),
    )
    useAuthStore.setState({ refreshUser, user: adminUser })
    render(<SettingsView />, { initialEntries: ['/settings?tab=profile'] })

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(refreshUser).toHaveBeenCalledOnce()

    const nameInput = screen.getByRole('textbox', { name: '姓名' })
    fireEvent.change(nameInput, { target: { value: '尚未保存的草稿' } })

    act(() => completeRefresh())
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(nameInput).toHaveValue('尚未保存的草稿')

    act(() => useAuthStore.setState({ user: memberUser }))
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(nameInput).toHaveValue('普通用户')
  })

  it('keeps password change behavior behind ODS tabs, fields, and actions', async () => {
    const changePassword = vi.fn().mockResolvedValue(true)
    useAuthStore.setState({ changePassword })
    const user = userEvent.setup()
    render(<SettingsView />, { initialEntries: ['/settings?tab=profile'] })

    await user.click(screen.getByRole('tab', { name: '安全设置' }))
    await user.type(screen.getByLabelText('当前密码'), 'old-secret')
    await user.type(screen.getByLabelText('新密码'), 'new-secret')
    await user.type(screen.getByLabelText('确认新密码'), 'new-secret')
    await user.click(screen.getByRole('button', { name: '修改密码' }))

    expect(changePassword).toHaveBeenCalledWith('old-secret', 'new-secret')
  })

  it('uses valid inline content inside the About pressable card', () => {
    render(<SettingsView />, { initialEntries: ['/settings?tab=about'] })

    const githubCard = screen.getByRole('button', { name: /开源地址/ })
    expect(githubCard).toHaveClass('ods-card')
    expect(githubCard).toHaveAttribute('data-pressable', 'true')
    expect(githubCard.querySelector('div')).toBeNull()
  })
})
