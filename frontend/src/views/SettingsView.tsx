import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Browser } from '@wailsio/runtime'
import api, { type ApiResponse } from '@/api'
import GlassCard from '@/components/common/GlassCard'
import DataSyncPanel from '@/components/settings/DataSyncPanel'
import DictionaryManagement from '@/components/settings/DictionaryManagement'
import NotificationManagement from '@/components/settings/NotificationManagement'
import TokenManagement from '@/components/settings/TokenManagement'
import UserManagement from '@/components/settings/UserManagement'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { type ThemeMode, useThemeStore } from '@/stores/theme'
import pkg from '../../package.json'

const themes: Array<{ icon: string; label: string; value: ThemeMode }> = [
  { icon: 'ri-computer-line', label: '跟随系统', value: 'auto' },
  { icon: 'ri-sun-line', label: '浅色模式', value: 'light' },
  { icon: 'ri-moon-line', label: '深色模式', value: 'dark' },
]

const techStack = [
  { key: 'wails', label: 'Wails v3' },
  { key: 'react', label: 'React' },
  { key: 'ts', label: 'TypeScript' },
  { key: 'go', label: 'Go' },
]

interface ReleaseInfo {
  html_url: string
  tag_name: string
}

export default function SettingsView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { confirm } = useConfirm()
  const toastError = useToastStore((state) => state.error)
  const toastInfo = useToastStore((state) => state.info)
  const toastSuccess = useToastStore((state) => state.success)
  const toastWarning = useToastStore((state) => state.warning)
  const user = useAuthStore((state) => state.user)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const changePassword = useAuthStore((state) => state.changePassword)
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const isAdmin = user?.role === 'admin'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile')
  const [profile, setProfile] = useState({
    department: user?.department || '',
    email: user?.email || '',
    name: user?.name || '',
    phone: user?.phone || '',
    position: user?.position || '',
  })
  const [originalProfile, setOriginalProfile] = useState(profile)
  const [securityForm, setSecurityForm] = useState({
    confirmPassword: '',
    newPassword: '',
    oldPassword: '',
  })
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshUser()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshUser])

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        const nextProfile = {
          department: user?.department || '',
          email: user?.email || '',
          name: user?.name || '',
          phone: user?.phone || '',
          position: user?.position || '',
        }
        setProfile(nextProfile)
        setOriginalProfile(nextProfile)
      },
      0,
    )
    return () => window.clearTimeout(timer)
  }, [user])

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true })
  }, [activeTab, setSearchParams])

  const settingsNav = useMemo(() => {
    const items = [
      { icon: 'ri-user-line', key: 'profile', label: '个人信息' },
      ...(isAdmin ? [{ icon: 'ri-team-line', key: 'users', label: '用户管理' }] : []),
      ...(isAdmin ? [{ icon: 'ri-book-2-line', key: 'dictionary', label: '字典管理' }] : []),
      { icon: 'ri-lock-line', key: 'security', label: '安全设置' },
      { icon: 'ri-cloud-line', key: 'data-sync', label: '数据同步' },
      { icon: 'ri-palette-line', key: 'appearance', label: '外观设置' },
      { icon: 'ri-notification-3-line', key: 'notification', label: '通知设置' },
      { icon: 'ri-terminal-box-line', key: 'developer', label: '开发设置' },
      { icon: 'ri-information-line', key: 'about', label: '关于' },
    ]
    return items
  }, [isAdmin])

  const saveProfile = async () => {
    const isModified =
      profile.name !== originalProfile.name ||
      profile.position !== originalProfile.position ||
      profile.email !== originalProfile.email ||
      profile.phone !== originalProfile.phone ||
      profile.department !== originalProfile.department

    if (!isModified) {
      toastInfo('未做任何修改')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (profile.email && !emailRegex.test(profile.email)) {
      toastWarning('邮箱格式不正确')
      return
    }

    const phoneRegex = /^1[3-9]\d{9}$/
    if (profile.phone && !phoneRegex.test(profile.phone)) {
      toastWarning('手机号格式不正确')
      return
    }

    const ok = await updateProfile(profile)
    if (ok) {
      toastSuccess('保存成功')
      setOriginalProfile(profile)
    }
  }

  const handlePasswordChange = async () => {
    if (!securityForm.oldPassword || !securityForm.newPassword || !securityForm.confirmPassword) {
      toastWarning('请填写所有密码字段')
      return
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toastWarning('两次输入的新密码不一致')
      return
    }
    if (securityForm.newPassword.length < 6) {
      toastWarning('新密码长度不能少于6位')
      return
    }

    const ok = await changePassword(securityForm.oldPassword, securityForm.newPassword)
    if (ok) {
      toastSuccess('密码修改成功')
      setSecurityForm({ confirmPassword: '', newPassword: '', oldPassword: '' })
    } else {
      toastError(useAuthStore.getState().error || '密码修改失败')
    }
  }

  const openExternalUrl = (url: string) => {
    void Browser.OpenURL(url).catch(() => {
      window.open(url, '_blank', 'noopener,noreferrer')
    })
  }

  const openGitHub = () => {
    openExternalUrl('https://github.com/FruitsAI/Orange')
  }

  const checkUpdate = async () => {
    setCheckingUpdate(true)
    try {
      const { data } = await api.get<ApiResponse<ReleaseInfo>>('/system/updates/check')
      const releaseInfo = data.data
      const latestVersionTag = releaseInfo.tag_name
      const cleanLatest = latestVersionTag.replace(/^v/, '')
      const cleanCurrent = pkg.version.replace(/^v/, '')

      if (cleanLatest === cleanCurrent) {
        toastSuccess(`当前已是最新版本 (v${cleanLatest})`)
        return
      }

      const confirmed = await confirm({
        message: `检测到新版本 ${latestVersionTag}，当前版本 v${cleanCurrent}。是否前往下载？`,
        title: '发现新版本',
      })

      if (confirmed) {
        openExternalUrl(releaseInfo.html_url)
      }
    } catch {
      toastError('检查更新失败，请稍后重试')
    } finally {
      setCheckingUpdate(false)
    }
  }

  const activePanel = () => {
    if (activeTab === 'users' && isAdmin) {
      return (
        <GlassCard className="h-fit flex flex-col p-0 overflow-hidden">
          <UserManagement />
        </GlassCard>
      )
    }

    if (activeTab === 'dictionary') {
      return (
        <GlassCard className="flex flex-col p-0">
          <DictionaryManagement />
        </GlassCard>
      )
    }

    if (activeTab === 'data-sync') {
      return (
        <GlassCard className="h-full" noPadding>
          <DataSyncPanel />
        </GlassCard>
      )
    }

    if (activeTab === 'developer') {
      return (
        <GlassCard className="h-full" noPadding>
          <TokenManagement />
        </GlassCard>
      )
    }

    if (activeTab === 'security') {
      return (
        <GlassCard className="security-card" noPadding>
          <div className="security-panel">
            <div className="dev-header">
              <div className="dev-header-content">
                <div className="dev-title-section">
                  <div className="dev-icon-wrapper">
                    <i className="ri-lock-line" />
                  </div>
                  <div className="dev-title-info">
                    <h2 className="dev-title">安全设置</h2>
                    <p className="dev-subtitle">管理账户安全，保护个人信息</p>
                  </div>
                </div>
                <button className="dev-create-btn" onClick={handlePasswordChange} type="button">
                  <i className="ri-lock-password-line" />
                  <span>修改密码</span>
                </button>
              </div>
            </div>

            <div className="dev-content">
              <div className="security-form-grid">
                <div className="form-group">
                  <label className="form-label">当前密码</label>
                  <input
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    className="form-input"
                    onChange={(event) =>
                      setSecurityForm((current) => ({
                        ...current,
                        oldPassword: event.target.value,
                      }))
                    }
                    placeholder="请输入当前密码"
                    spellCheck={false}
                    type="password"
                    value={securityForm.oldPassword}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">新密码</label>
                  <input
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    className="form-input"
                    onChange={(event) =>
                      setSecurityForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    placeholder="请输入新密码（至少6位）"
                    spellCheck={false}
                    type="password"
                    value={securityForm.newPassword}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">确认新密码</label>
                  <input
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    className="form-input"
                    onChange={(event) =>
                      setSecurityForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    placeholder="请再次输入新密码"
                    spellCheck={false}
                    type="password"
                    value={securityForm.confirmPassword}
                  />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )
    }

    if (activeTab === 'notification') {
      return (
        <GlassCard className="h-full" noPadding>
          <NotificationManagement isAdmin={isAdmin} />
        </GlassCard>
      )
    }

    if (activeTab === 'appearance') {
      return (
        <GlassCard className="appearance-card" noPadding>
          <div className="appearance-panel">
            <div className="appearance-header">
              <div className="appearance-header-main">
                <div className="appearance-title-wrapper">
                  <div className="appearance-icon">
                    <i className="ri-palette-line" />
                  </div>
                  <div className="appearance-title-content">
                    <h2 className="appearance-title">外观设置</h2>
                    <p className="appearance-subtitle">自定义界面主题，打造专属的使用体验</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="appearance-content">
              <div className="grid grid-cols-3 gap-4">
                {themes.map((item) => (
                  <div
                    className={`theme-card ${theme === item.value ? 'active' : ''}`}
                    key={item.value}
                    onKeyUp={(event) => {
                      if (event.key === 'Enter') setTheme(item.value)
                    }}
                    onClick={() => setTheme(item.value)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="theme-icon">
                      <i className={item.icon} />
                    </div>
                    <span className="theme-label">{item.label}</span>
                    {theme === item.value ? (
                      <div className="theme-check">
                        <i className="ri-check-line" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )
    }

    if (activeTab === 'about') {
      return (
        <GlassCard className="about-page h-auto min-h-full">
          <div className="about-container">
            <div className="about-hero">
              <div className="logo-wrapper">
                <div className="logo-glow" />
                <img alt="Orange Logo" className="about-logo" src="/orange.png" />
              </div>
              <h1 className="about-title">Orange</h1>
              <div className="about-subtitle">
                <span className="version-badge">v{pkg.version}</span>
                <span className="tagline">小旭姐专属记账工具</span>
              </div>
            </div>

            <div className="info-cards-grid">
              <div className="info-card info-card-author">
                <div className="card-glass">
                  <div className="card-icon-wrapper">
                    <i className="ri-user-smile-line" />
                  </div>
                  <div className="card-label">作者</div>
                  <div className="card-value">willxue</div>
                </div>
              </div>
              <div className="info-card info-card-wechat">
                <div className="card-glass">
                  <div className="card-icon-wrapper">
                    <i className="ri-wechat-line" />
                  </div>
                  <div className="card-label">微信公众号</div>
                  <div className="card-value">为学书院</div>
                </div>
              </div>
              <div
                className="info-card info-card-github"
                onClick={openGitHub}
                onKeyUp={(event) => {
                  if (event.key === 'Enter') openGitHub()
                }}
                role="button"
                tabIndex={0}
              >
                <div className="card-glass">
                  <div className="card-icon-wrapper">
                    <i className="ri-github-line" />
                  </div>
                  <div className="card-label">开源地址</div>
                  <div className="card-value">
                    FruitsAI/Orange
                    <i className="ri-arrow-right-up-line external-icon" />
                  </div>
                </div>
              </div>
            </div>

            <div className="tech-stack">
              {techStack.map((tech) => (
                <div className="tech-pill" data-tech={tech.key} key={tech.key}>
                  <span className="tech-dot" />
                  <span className="tech-name">{tech.label}</span>
                </div>
              ))}
            </div>

            <button
              className={`update-btn ${checkingUpdate ? 'updating' : ''}`}
              disabled={checkingUpdate}
              onClick={() => void checkUpdate()}
              type="button"
            >
              <span className="btn-glow" />
              <span className="btn-content">
                <i className={`ri-loop-left-line btn-icon ${checkingUpdate ? 'spinning' : ''}`} />
                <span className="btn-text">{checkingUpdate ? '正在检测更新...' : '检测更新'}</span>
              </span>
            </button>

            <div className="copyright">
              <span className="copyright-text">© {new Date().getFullYear()} FruitsAI</span>
              <span className="copyright-divider">·</span>
              <span className="copyright-rights">All rights reserved</span>
            </div>
          </div>
        </GlassCard>
      )
    }

    return (
      <GlassCard className="profile-card" noPadding>
        <div className="profile-panel">
          <div className="dev-header">
            <div className="dev-header-content">
              <div className="dev-title-section">
                <div className="dev-icon-wrapper">
                  <i className="ri-user-3-line" />
                </div>
                <div className="dev-title-info">
                  <h2 className="dev-title">个人信息</h2>
                  <p className="dev-subtitle">管理您的个人资料和联系方式</p>
                </div>
              </div>
              <button className="dev-create-btn" onClick={saveProfile} type="button">
                <i className="ri-save-line" />
                <span>保存更改</span>
              </button>
            </div>
          </div>

          <div className="dev-content">
            <div className="profile-form-grid">
              <div className="form-group">
                <label className="form-label">姓名</label>
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  className="form-input"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, name: event.target.value }))
                  }
                  spellCheck={false}
                  type="text"
                  value={profile.name}
                />
              </div>
              <div className="form-group">
                <label className="form-label">职位</label>
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  className="form-input"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, position: event.target.value }))
                  }
                  spellCheck={false}
                  type="text"
                  value={profile.position}
                />
              </div>
              <div className="form-group">
                <label className="form-label">邮箱</label>
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  className="form-input"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, email: event.target.value }))
                  }
                  spellCheck={false}
                  type="email"
                  value={profile.email}
                />
              </div>
              <div className="form-group">
                <label className="form-label">手机</label>
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  className="form-input"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, phone: event.target.value }))
                  }
                  spellCheck={false}
                  type="tel"
                  value={profile.phone}
                />
              </div>
              <div className="form-group form-group-full">
                <label className="form-label">部门</label>
                <input
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  className="form-input"
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, department: event.target.value }))
                  }
                  spellCheck={false}
                  type="text"
                  value={profile.department}
                />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="settings-view grid gap-lg">
      <GlassCard className="p-0 h-fit nav-card">
        <div className="nav-header">设置</div>
        <div className="nav-list">
          {settingsNav.map((item) => (
            <a
              className={`nav-item-settings ${activeTab === item.key ? 'active' : ''}`}
              href="#"
              key={item.key}
              onClick={(event) => {
                event.preventDefault()
                setActiveTab(item.key)
              }}
            >
              <i className={`${item.icon} nav-icon`} />{' '}
              <span className="nav-label">{item.label}</span>
            </a>
          ))}
        </div>
      </GlassCard>

      {activePanel()}
    </div>
  )
}
