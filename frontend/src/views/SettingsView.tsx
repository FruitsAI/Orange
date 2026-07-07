import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DataSyncPanel from '@/components/settings/DataSyncPanel'
import DictionaryManagement from '@/components/settings/DictionaryManagement'
import NotificationManagement from '@/components/settings/NotificationManagement'
import TokenManagement from '@/components/settings/TokenManagement'
import UserManagement from '@/components/settings/UserManagement'
import { useAuthStore } from '@/stores/auth'

const tabs = [
  { id: 'profile', label: '个人信息' },
  { id: 'tokens', label: '访问令牌' },
  { id: 'users', label: '用户管理' },
  { id: 'dictionary', label: '数据字典' },
  { id: 'notification', label: '通知管理' },
  { id: 'sync', label: '数据同步' },
]

export default function SettingsView() {
  const [searchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile')

  const activePanel = useMemo(() => {
    if (activeTab === 'tokens') return <TokenManagement />
    if (activeTab === 'users') return <UserManagement />
    if (activeTab === 'dictionary') return <DictionaryManagement />
    if (activeTab === 'notification') return <NotificationManagement />
    if (activeTab === 'sync') return <DataSyncPanel />
    return (
      <div className="settings-profile glass-card">
        <div>
          <span className="text-secondary">用户名</span>
          <strong>{user?.username || '-'}</strong>
        </div>
        <div>
          <span className="text-secondary">姓名</span>
          <strong>{user?.name || '-'}</strong>
        </div>
        <div>
          <span className="text-secondary">角色</span>
          <strong>{user?.role || '-'}</strong>
        </div>
      </div>
    )
  }, [activeTab, user])

  return (
    <div className="settings-view">
      <div className="settings-tabs">
        {tabs.map((tab) => (
          <button
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activePanel}
    </div>
  )
}
