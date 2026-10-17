import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Browser } from '@wailsio/runtime'
import api, { type ApiResponse } from '@/api'
import type { User } from '@/api/auth'
import DataSyncPanel from '@/components/settings/DataSyncPanel'
import DictionaryManagement from '@/components/settings/DictionaryManagement'
import NotificationManagement from '@/components/settings/NotificationManagement'
import TokenManagement from '@/components/settings/TokenManagement'
import UserManagement from '@/components/settings/UserManagement'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'
import {
  Button,
  Card,
  Chip,
  Field,
  FormGrid,
  Image,
  Input,
  Radio,
  RadioGroup,
  SectionHeader,
  Surface,
  Tabs,
} from '@/design-system'
import { useAuthStore } from '@/stores/auth'
import { THEME_OPTIONS, useThemeStore } from '@/stores/theme'
import '@/styles/settings.css'
import pkg from '../../package.json'

const techStack = [
  { key: 'wails', label: 'Wails v3' },
  { key: 'react', label: 'React' },
  { key: 'ts', label: 'TypeScript' },
  { key: 'go', label: 'Go' },
]

const compactSettingsNavigationQuery = '(max-width: 48rem)'

const useCompactSettingsNavigation = () => {
  const [isCompact, setIsCompact] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia(compactSettingsNavigationQuery).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(compactSettingsNavigationQuery)
    const sync = () => setIsCompact(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return isCompact
}

interface ReleaseInfo {
  html_url: string
  tag_name: string
}

interface ProfileFields {
  department: string
  email: string
  name: string
  phone: string
  position: string
}

interface ProfileFormState {
  baseline: ProfileFields
  draft: ProfileFields
  identity: string | null
}

const profileFromUser = (user: User | null): ProfileFields => ({
  department: user?.department || '',
  email: user?.email || '',
  name: user?.name || '',
  phone: user?.phone || '',
  position: user?.position || '',
})

const userIdentity = (user: User | null) => (user ? `${user.id}:${user.username}` : null)

const profilesMatch = (first: ProfileFields, second: ProfileFields) =>
  first.department === second.department &&
  first.email === second.email &&
  first.name === second.name &&
  first.phone === second.phone &&
  first.position === second.position

const createProfileFormState = (user: User | null): ProfileFormState => {
  const profile = profileFromUser(user)
  return {
    baseline: profile,
    draft: profile,
    identity: userIdentity(user),
  }
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
  const compactNavigation = useCompactSettingsNavigation()
  const isAdmin = user?.role === 'admin'
  const [profileForm, setProfileForm] = useState(() => createProfileFormState(user))
  const profile = profileForm.draft
  const originalProfile = profileForm.baseline
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
    const timer = window.setTimeout(() => {
      const nextProfile = profileFromUser(user)
      const nextIdentity = userIdentity(user)

      setProfileForm((current) => {
        const identityChanged = current.identity !== nextIdentity
        const isDirty = !profilesMatch(current.draft, current.baseline)

        if (!identityChanged && isDirty) return current

        return {
          baseline: nextProfile,
          draft: nextProfile,
          identity: nextIdentity,
        }
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [user])

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

  const requestedTab = searchParams.get('tab')
  const activeTab =
    requestedTab && settingsNav.some((item) => item.key === requestedTab) ? requestedTab : 'profile'
  const profileDirty = !profilesMatch(profile, originalProfile)

  const selectTab = (tab: string) => {
    if (tab === activeTab || !settingsNav.some((item) => item.key === tab)) return

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('tab', tab)
    setSearchParams(nextSearchParams)
  }

  const updateProfileField = (field: keyof ProfileFields, value: string) => {
    setProfileForm((current) => ({
      ...current,
      draft: { ...current.draft, [field]: value },
    }))
  }

  const saveProfile = async () => {
    const isModified = !profilesMatch(profile, originalProfile)

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

    const submittedProfile = profile
    const submittedIdentity = profileForm.identity
    const ok = await updateProfile(submittedProfile)
    if (ok) {
      toastSuccess('保存成功')
      setProfileForm((current) => {
        if (current.identity !== submittedIdentity) return current

        return {
          ...current,
          baseline: submittedProfile,
          draft: profilesMatch(current.draft, submittedProfile) ? submittedProfile : current.draft,
        }
      })
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
        <section className="settings-management-panel" aria-label="用户管理设置">
          <UserManagement />
        </section>
      )
    }

    if (activeTab === 'dictionary') {
      return (
        <section className="settings-management-panel" aria-label="字典管理设置">
          <DictionaryManagement />
        </section>
      )
    }

    if (activeTab === 'data-sync') {
      return (
        <section className="settings-management-panel" aria-label="数据同步设置">
          <DataSyncPanel />
        </section>
      )
    }

    if (activeTab === 'developer') {
      return (
        <section className="settings-management-panel" aria-label="开发设置">
          <TokenManagement />
        </section>
      )
    }

    if (activeTab === 'security') {
      return (
        <Card.Root className="security-card" gap="lg" padding="lg" variant="secondary">
          <SectionHeader
            actions={
              <Button onClick={handlePasswordChange}>
                <i className="ri-lock-password-line" />
                <span>修改密码</span>
              </Button>
            }
            description="管理账户安全，保护个人信息"
            icon={<i className="ri-lock-line" />}
            size="lg"
            title="安全设置"
          />

          <FormGrid columns={3}>
            <Field.Root>
              <Field.Label>当前密码</Field.Label>
              <Input
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
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
            </Field.Root>
            <Field.Root>
              <Field.Label>新密码</Field.Label>
              <Input
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
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
            </Field.Root>
            <Field.Root>
              <Field.Label>确认新密码</Field.Label>
              <Input
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
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
            </Field.Root>
          </FormGrid>
        </Card.Root>
      )
    }

    if (activeTab === 'notification') {
      return (
        <section className="settings-management-panel" aria-label="通知设置">
          <NotificationManagement isAdmin={isAdmin} />
        </section>
      )
    }

    if (activeTab === 'appearance') {
      return (
        <Card.Root className="appearance-card" gap="lg" padding="lg" variant="secondary">
          <SectionHeader
            description="自定义界面主题，打造专属的使用体验"
            icon={<i className="ri-palette-line" />}
            size="lg"
            title="外观设置"
          />

          <RadioGroup
            aria-label="主题模式"
            columns={3}
            name="appearance-theme"
            onValueChange={(value) => setTheme(value as typeof theme)}
            value={theme}
          >
            {THEME_OPTIONS.map((item) => (
              <Radio key={item.value} value={item.value} variant="card">
                <span className="theme-card-content" data-active={theme === item.value}>
                  <span className="theme-icon">
                    <i className={item.icon} />
                  </span>
                  <span className="theme-label">{item.label}</span>
                  {theme === item.value ? (
                    <span className="theme-check">
                      <i className="ri-check-line" />
                    </span>
                  ) : null}
                </span>
              </Radio>
            ))}
          </RadioGroup>
        </Card.Root>
      )
    }

    if (activeTab === 'about') {
      return (
        <section className="about-page">
          <div className="about-container">
            <div className="about-hero">
              <div className="logo-wrapper">
                <div className="logo-glow" />
                <Image alt="Orange Logo" className="about-logo" src="/orange.png" />
              </div>
              <h1 className="about-title">Orange</h1>
              <div className="about-subtitle">
                <Chip size="sm" tone="accent">
                  v{pkg.version}
                </Chip>
                <span className="tagline">小旭姐专属记账工具</span>
              </div>
            </div>

            <div className="info-cards-grid">
              <Card.Root className="info-card" gap="sm" padding="lg" variant="tertiary">
                <Surface
                  as="span"
                  className="card-icon-wrapper"
                  padding="none"
                  radius="panel"
                  tone="accent"
                >
                  <i className="ri-user-smile-line" />
                </Surface>
                <span className="card-label">作者</span>
                <span className="card-value">willxue</span>
              </Card.Root>
              <Card.Root className="info-card" gap="sm" padding="lg" variant="tertiary">
                <Surface
                  as="span"
                  className="card-icon-wrapper"
                  padding="none"
                  radius="panel"
                  tone="success"
                >
                  <i className="ri-wechat-line" />
                </Surface>
                <span className="card-label">微信公众号</span>
                <span className="card-value">为学书院</span>
              </Card.Root>
              <Card.Root
                as="button"
                className="info-card"
                gap="sm"
                onClick={openGitHub}
                padding="lg"
                pressable
                type="button"
                variant="tertiary"
              >
                <Surface
                  as="span"
                  className="card-icon-wrapper"
                  padding="none"
                  radius="panel"
                  variant="inset"
                >
                  <i className="ri-github-line" />
                </Surface>
                <span className="card-label">开源地址</span>
                <span className="card-value">
                  FruitsAI/Orange
                  <i className="ri-arrow-right-up-line external-icon" />
                </span>
              </Card.Root>
            </div>

            <div className="tech-stack">
              {techStack.map((tech) => (
                <Chip data-tech={tech.key} key={tech.key}>
                  <span className="tech-dot" />
                  <span className="tech-name">{tech.label}</span>
                </Chip>
              ))}
            </div>

            <Button onClick={() => void checkUpdate()} pending={checkingUpdate}>
              <i className={`ri-loop-left-line ${checkingUpdate ? 'spinning' : ''}`} />
              <span>{checkingUpdate ? '正在检测更新...' : '检测更新'}</span>
            </Button>

            <div className="copyright">
              <span className="copyright-text">© {new Date().getFullYear()} FruitsAI</span>
              <span className="copyright-divider">·</span>
              <span className="copyright-rights">All rights reserved</span>
            </div>
          </div>
        </section>
      )
    }

    return (
      <Card.Root className="profile-card" gap="lg" padding="lg" variant="secondary">
        <SectionHeader
          actions={
            <Button onClick={saveProfile}>
              <i className="ri-save-line" />
              <span>保存更改</span>
            </Button>
          }
          description="管理您的个人资料和联系方式"
          icon={<i className="ri-user-3-line" />}
          size="lg"
          title="个人信息"
        />

        <FormGrid columns={2}>
          <Field.Root>
            <Field.Label>姓名</Field.Label>
            <Input
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              onChange={(event) => updateProfileField('name', event.target.value)}
              spellCheck={false}
              type="text"
              value={profile.name}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>职位</Field.Label>
            <Input
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              onChange={(event) => updateProfileField('position', event.target.value)}
              spellCheck={false}
              type="text"
              value={profile.position}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>邮箱</Field.Label>
            <Input
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              onChange={(event) => updateProfileField('email', event.target.value)}
              spellCheck={false}
              type="email"
              value={profile.email}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>手机</Field.Label>
            <Input
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              onChange={(event) => updateProfileField('phone', event.target.value)}
              spellCheck={false}
              type="tel"
              value={profile.phone}
            />
          </Field.Root>
          <Field.Root className="settings-field--full">
            <Field.Label>部门</Field.Label>
            <Input
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              onChange={(event) => updateProfileField('department', event.target.value)}
              spellCheck={false}
              type="text"
              value={profile.department}
            />
          </Field.Root>
        </FormGrid>
      </Card.Root>
    )
  }

  return (
    <div className="settings-workspace" data-motion-scope="settings">
      <Tabs.Root className="settings-view" onValueChange={selectTab} value={activeTab}>
        <aside className="settings-navigation" aria-label="设置导航">
          <Card.Root className="nav-card" gap="sm" padding="sm" variant="secondary">
            <div className="settings-nav-header">
              <span aria-hidden="true" className="settings-nav-header__icon">
                <i className="ri-equalizer-2-line" />
              </span>
              <span className="settings-nav-header__copy">
                <strong>设置分类</strong>
                <span>{settingsNav.length} 个可用分区</span>
              </span>
            </div>

            <Tabs.List
              aria-label="设置分类"
              orientation={compactNavigation ? 'horizontal' : 'vertical'}
              variant="rail"
            >
              {settingsNav.map((item) => (
                <Tabs.Tab key={item.key} value={item.key}>
                  <i aria-hidden="true" className={item.icon} />
                  <span>{item.label}</span>
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <div className="settings-nav-footer">
              <i aria-hidden="true" className="ri-shield-check-line" />
              <span>{isAdmin ? '管理权限已启用' : '账户配置受保护'}</span>
            </div>
          </Card.Root>
        </aside>

        <Tabs.Panel className="settings-content" value={activeTab}>
          <div className="settings-panel-frame" key={activeTab}>
            {activeTab === 'profile' && profileDirty ? (
              <div className="settings-unsaved-indicator" role="status">
                <i aria-hidden="true" className="ri-edit-circle-line" />
                有尚未保存的个人信息更改
              </div>
            ) : null}
            {activePanel()}
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
