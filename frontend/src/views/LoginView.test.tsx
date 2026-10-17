import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import LoginView from './LoginView'

describe('LoginView', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAuthStore.setState({
      error: null,
      isAuthenticated: false,
      isLoggedIn: false,
      loading: false,
      login: vi.fn().mockResolvedValue(true),
      token: null,
      user: null,
    })
    useThemeStore.setState({ effectiveTheme: 'light', theme: 'light' })
  })

  it('submits credentials and remembers the username with ODS form controls', async () => {
    const login = vi.fn().mockResolvedValue(true)
    useAuthStore.setState({ login })
    const { container } = render(<LoginView />, { initialEntries: ['/login'] })

    fireEvent.change(screen.getByRole('textbox', { name: '用户名 / 邮箱 / 手机号' }), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'admin123' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '记住用户名' }))
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({ password: 'admin123', username: 'admin' }),
    )
    expect(window.localStorage.getItem('lastUsername')).toBe('admin')
    expect(container.querySelectorAll('.ods-field')).toHaveLength(2)
    expect(container.querySelectorAll('.ods-input')).toHaveLength(2)
    expect(container.querySelectorAll('.ods-input[data-size="lg"]')).toHaveLength(2)
    expect(container.querySelectorAll('.ods-input-group[data-size="lg"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-adornment-spacing="balanced"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-focus-adornment-tone="accent"]')).toHaveLength(2)
    expect(container.querySelector('.ods-checkbox')).toBeInTheDocument()
    expect(container.querySelector('.ods-button[type="submit"]')).toHaveAttribute('data-size', 'lg')
    expect(screen.getByRole('button', { name: '显示密码' })).toHaveAttribute('data-size', 'md')
    expect(screen.getByRole('button', { name: '切换至深色主题' })).toHaveAttribute(
      'data-tone',
      'accent',
    )
    expect(container.querySelector('.input-wrapper')).not.toBeInTheDocument()
    expect(container.querySelector('.btn-primary-login')).not.toBeInTheDocument()
  })

  it('shows the bundled logo immediately through the Image motion contract', () => {
    render(<LoginView />)

    expect(screen.getByRole('img', { name: 'Orange Logo' }).parentElement).toHaveAttribute(
      'data-disable-animation',
      'true',
    )
  })

  it('toggles password visibility and reads the latest store error for consecutive failures', async () => {
    const login = vi
      .fn()
      .mockImplementationOnce(async () => {
        useAuthStore.setState({ error: '首次登录失败' })
        return false
      })
      .mockImplementationOnce(async () => {
        useAuthStore.setState({ error: '连续登录失败' })
        return false
      })
    useAuthStore.setState({ error: null, login })
    const { container } = render(<LoginView />)

    const password = screen.getByLabelText('密码')
    expect(password).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: '显示密码' }))
    expect(password).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: '登录' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('首次登录失败'))

    fireEvent.click(screen.getByRole('button', { name: '登录' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('连续登录失败'))
    expect(login).toHaveBeenCalledTimes(2)
    expect(container.querySelector('.ods-alert')).toBeInTheDocument()
  })
})
