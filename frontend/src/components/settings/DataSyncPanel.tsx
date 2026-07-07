import { FormEvent, useState } from 'react'
import { syncApi, type SyncConfig } from '@/api/sync'
import GlassCard from '@/components/common/GlassCard'
import { useToastStore } from '@/composables/useToast'

const defaultConfig: SyncConfig = {
  db_name: '',
  db_type: 'postgres',
  host: '',
  password: '',
  port: 5432,
  ssl_mode: 'require',
  user: '',
}

export default function DataSyncPanel() {
  const toast = useToastStore()
  const [config, setConfig] = useState<SyncConfig>(defaultConfig)
  const [testing, setTesting] = useState(false)

  const updateConfig = (patch: Partial<SyncConfig>) => setConfig((current) => ({ ...current, ...patch }))

  const testConnection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTesting(true)
    try {
      await syncApi.testConnection(config)
      toast.success('连接测试成功')
    } catch {
      toast.error('连接测试失败')
    } finally {
      setTesting(false)
    }
  }

  return (
    <GlassCard>
      <form className="form-grid" onSubmit={testConnection}>
        <div className="form-field">
          <label>数据库类型</label>
          <select value={config.db_type} onChange={(event) => updateConfig({ db_type: event.target.value })}>
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>
        </div>
        <div className="form-field">
          <label>Host</label>
          <input required value={config.host} onChange={(event) => updateConfig({ host: event.target.value })} />
        </div>
        <div className="form-field">
          <label>Port</label>
          <input
            required
            type="number"
            value={config.port}
            onChange={(event) => updateConfig({ port: Number(event.target.value) })}
          />
        </div>
        <div className="form-field">
          <label>数据库名</label>
          <input required value={config.db_name} onChange={(event) => updateConfig({ db_name: event.target.value })} />
        </div>
        <div className="form-field">
          <label>用户</label>
          <input required value={config.user} onChange={(event) => updateConfig({ user: event.target.value })} />
        </div>
        <div className="form-field">
          <label>密码</label>
          <input
            type="password"
            value={config.password || ''}
            onChange={(event) => updateConfig({ password: event.target.value })}
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={testing} type="submit">
            {testing ? '测试中...' : '测试连接'}
          </button>
        </div>
      </form>
    </GlassCard>
  )
}
