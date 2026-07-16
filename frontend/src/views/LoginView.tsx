import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Field,
  IconButton,
  Image,
  Input,
  InputGroup,
} from '@/design-system'
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

    setLoginError(useAuthStore.getState().error || '登录失败')
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

      <IconButton
        className="login-theme-toggle"
        label={effectiveTheme === 'dark' ? '切换至亮色主题' : '切换至深色主题'}
        onClick={toggleTheme}
        title="切换主题"
        variant="secondary"
      >
        <i className={effectiveTheme === 'dark' ? 'ri-moon-line' : 'ri-sun-line'} />
      </IconButton>

      <div className="login-container">
        <Card.Root className="login-card" padding="lg" variant="tertiary">
          <div className="login-logo">
            <div className="login-logo-icon">
              <Image
                alt="Orange Logo"
                background="transparent"
                className="login-logo-image"
                radius="full"
                showSkeleton={false}
                src="/orange.png"
              />
            </div>
            <h1>Orange</h1>
            <p>项目收款管理系统</p>
          </div>

          <div className="form-panel active-panel">
            <form className="login-form" onSubmit={handleLogin}>
              <Field.Root id="username">
                <Field.Label>用户名 / 邮箱 / 手机号</Field.Label>
                <InputGroup startContent={<i aria-hidden="true" className="ri-mail-line" />}>
                  <Input
                    autoCapitalize="off"
                    autoComplete="username"
                    autoCorrect="off"
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="请输入用户名或邮箱"
                    spellCheck={false}
                    type="text"
                    value={username}
                  />
                </InputGroup>
              </Field.Root>

              <Field.Root id="password">
                <Field.Label>密码</Field.Label>
                <InputGroup
                  endContent={
                    <IconButton
                      label={showPassword ? '隐藏密码' : '显示密码'}
                      onClick={() => setShowPassword((value) => !value)}
                      size="sm"
                      variant="ghost"
                    >
                      <i className={showPassword ? 'ri-eye-line' : 'ri-eye-off-line'} />
                    </IconButton>
                  }
                  startContent={<i aria-hidden="true" className="ri-lock-line" />}
                >
                  <Input
                    autoCapitalize="off"
                    autoComplete="current-password"
                    autoCorrect="off"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入密码"
                    spellCheck={false}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                </InputGroup>
              </Field.Root>

              <div className="login-form__options">
                <Checkbox
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                >
                  记住用户名
                </Checkbox>
              </div>

              {loginError ? (
                <Alert
                  className="login-alert"
                  icon={<i className="ri-error-warning-line" />}
                  title={loginError}
                  tone="danger"
                />
              ) : null}

              <Button fullWidth pending={loading} type="submit" variant="primary">
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </div>
        </Card.Root>
      </div>
    </div>
  )
}
