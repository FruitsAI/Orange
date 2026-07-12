import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const getLastUsername = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem('lastUsername') || ''
}

export default function LoginView() {
  const navigate = useNavigate()
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const effectiveTheme = useThemeStore((state) => state.effectiveTheme)
  const login = useAuthStore((state) => state.login)
  const loading = useAuthStore((state) => state.loading)
  const error = useAuthStore((state) => state.error)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState(getLastUsername)
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(Boolean(getLastUsername()))
  const [loginError, setLoginError] = useState('')

  if (isLoggedIn) {
    return <Navigate replace to="/dashboard" />
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')

    const success = await login({ username, password })
    if (success) {
      if (rememberMe) {
        window.localStorage.setItem('lastUsername', username)
      } else {
        window.localStorage.removeItem('lastUsername')
      }
      await navigate('/dashboard')
      return
    }

    setLoginError(error || '登录失败')
  }

  return (
    <div className="login-wrapper">
      <div className="login-background" />
      <div className="floating-shapes">
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
        <div className="shape" />
      </div>

      <button
        aria-label={effectiveTheme === 'dark' ? '切换至亮色主题' : '切换至深色主题'}
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title="切换主题"
        type="button"
      >
        <i className={effectiveTheme === 'dark' ? 'ri-moon-line' : 'ri-sun-line'} />
      </button>

      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">
              <img alt="Orange Logo" src="/orange.png" />
            </div>
            <h1>Orange</h1>
            <p>项目收款管理系统</p>
          </div>

          <div className="form-panel active-panel">
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="username">用户名 / 邮箱 / 手机号</label>
                <div className="input-wrapper">
                  <input
                    autoCapitalize="off"
                    autoComplete="username"
                    autoCorrect="off"
                    id="username"
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="请输入用户名或邮箱"
                    spellCheck={false}
                    type="text"
                    value={username}
                  />
                  <i className="ri-mail-line login-icon-override" />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">密码</label>
                <div className="input-wrapper">
                  <input
                    autoCapitalize="off"
                    autoComplete="current-password"
                    autoCorrect="off"
                    id="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入密码"
                    spellCheck={false}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <i className="ri-lock-line login-icon-override" />
                  <button
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    className="password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    type="button"
                  >
                    <i className={showPassword ? 'ri-eye-line' : 'ri-eye-off-line'} />
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    type="checkbox"
                  />
                  <span>记住用户名</span>
                </label>
              </div>

              {loginError ? <div className="login-error">{loginError}</div> : null}

              <button className="btn-primary-login" disabled={loading} type="submit">
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
