import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { syncApi, type SyncConfig, type SyncResult, type TableCompareResult } from '@/api/sync'
import { useConfirm } from '@/composables/useConfirm'
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

const dbTypeOptions = [
  { icon: 'ri-database-2-fill', label: 'PostgreSQL / Supabase / Nile', value: 'postgres' },
  { icon: 'ri-database-2-line', label: 'MySQL / TiDB', value: 'mysql' },
]

const tableLabels: Record<string, string> = {
  dictionaries: '字典分类',
  dictionary_item: '字典详情',
  notifications: '通知表',
  payments: '收款表',
  personal_access_tokens: '访问令牌',
  projects: '项目表',
  user_notifications: '用户通知状态',
  users: '用户表',
}

export default function DataSyncPanel() {
  const { confirm } = useConfirm()
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const toastWarning = useToastStore((state) => state.warning)
  const [cloudConfig, setCloudConfig] = useState<SyncConfig>(defaultConfig)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [compareResults, setCompareResults] = useState<TableCompareResult[]>([])
  const [syncResults, setSyncResults] = useState<SyncResult[]>([])
  const [step, setStep] = useState<'compare' | 'config' | 'sync'>('config')
  const refreshTimer = useRef<number | null>(null)

  const diffCount = useMemo(
    () => compareResults.filter((result) => result.local_count !== result.remote_count).length,
    [compareResults],
  )
  const syncedCount = useMemo(() => syncResults.filter((result) => result.success).length, [syncResults])

  const updateConfig = (patch: Partial<SyncConfig>) => {
    setCloudConfig((current) => ({ ...current, ...patch }))
  }

  const handleDbTypeChange = (dbType: string) => {
    setCloudConfig((current) => ({
      ...current,
      db_type: dbType,
      port: dbType === 'mysql' ? 3306 : 5432,
      ssl_mode: dbType === 'mysql' ? 'false' : 'require',
    }))
  }

  const getSyncResultForTable = useCallback(
    (tableName: string) => syncResults.find((result) => result.table_name === tableName),
    [syncResults],
  )

  const compareData = useCallback(async () => {
    setLoading(true)
    setStep('compare')
    setCompareResults([])
    setSyncResults([])

    try {
      const response = await syncApi.compare(cloudConfig)
      setCompareResults(response.data.data)
    } catch {
      toastError('获取对比数据失败')
    } finally {
      setLoading(false)
    }
  }, [cloudConfig, toastError])

  const testConnection = async () => {
    if (!cloudConfig.host || !cloudConfig.user || !cloudConfig.db_name) {
      toastWarning('请填写完整的数据库连接信息')
      return
    }

    setTestLoading(true)
    try {
      await syncApi.testConnection(cloudConfig)
      toastSuccess('连接成功')
      await compareData()
    } catch {
      toastError('连接失败，请检查网络或配置')
    } finally {
      setTestLoading(false)
    }
  }

  const startSync = async () => {
    const confirmed = await confirm({
      message: '此操作将把本地数据覆盖写入到云端数据库，云端已有的同ID数据将被更新。确定要继续吗？',
      title: '确认同步',
    })
    if (!confirmed) return

    setSyncLoading(true)
    setStep('sync')

    try {
      const tables = compareResults.map((result) => result.table_name)
      const response = await syncApi.execute(cloudConfig, tables)
      const results = response.data.data
      setSyncResults(results)

      const failed = results.filter((result) => !result.success)
      if (failed.length > 0) {
        toastWarning(`同步完成，但有 ${failed.length} 个表同步失败`)
      } else {
        toastSuccess('所有数据同步成功！')
        refreshTimer.current = window.setTimeout(() => {
          void compareData()
        }, 1000)
      }
    } catch {
      toastError('同步过程中发生错误')
    } finally {
      setSyncLoading(false)
    }
  }

  const loadConfig = useCallback(async () => {
    try {
      const response = await syncApi.getConfig()
      const config = response.data.data as Partial<SyncConfig> | undefined
      if (!config?.host) return

      setCloudConfig((current) => ({
        ...current,
        ...config,
        port: Number(config.port) || current.port,
      }))
    } catch {
      toastError('加载同步配置失败')
    }
  }, [toastError])

  useEffect(() => {
    const timer = window.setTimeout(loadConfig, 0)
    return () => window.clearTimeout(timer)
  }, [loadConfig])

  useEffect(() => {
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current)
    }
  }, [])

  return (
    <div className="data-sync-panel">
      <div className="sync-header">
        <div className="sync-header-main">
          <div className="sync-title-wrapper">
            <div className="sync-icon">
              <i className="ri-cloud-line" />
            </div>
            <div className="sync-title-content">
              <h2 className="sync-title">数据同步</h2>
              <p className="sync-subtitle">将本地 SQLite 数据同步到云端 PostgreSQL 或 MySQL 数据库</p>
            </div>
          </div>
          {step !== 'config' ? (
            <button className="sync-action-btn secondary" onClick={() => setStep('config')} type="button">
              <i className="ri-settings-3-line" />
              <span>修改配置</span>
            </button>
          ) : null}
        </div>

        <div className="sync-stats">
          <div className="sync-stat-item">
            <div className="sync-stat-icon blue">
              <i className="ri-database-2-line" />
            </div>
            <div className="sync-stat-info">
              <span className="sync-stat-value">{compareResults.length}</span>
              <span className="sync-stat-label">数据表</span>
            </div>
          </div>
          <div className="sync-stat-item">
            <div className="sync-stat-icon orange">
              <i className="ri-exchange-line" />
            </div>
            <div className="sync-stat-info">
              <span className="sync-stat-value">{diffCount}</span>
              <span className="sync-stat-label">待同步</span>
            </div>
          </div>
          <div className="sync-stat-item">
            <div className="sync-stat-icon green">
              <i className="ri-check-double-line" />
            </div>
            <div className="sync-stat-info">
              <span className="sync-stat-value">{syncedCount}</span>
              <span className="sync-stat-label">已同步</span>
            </div>
          </div>
        </div>
      </div>

      {step === 'config' ? (
        <div className="sync-content">
          <div className="sync-alert">
            <div className="sync-alert-icon">
              <i className="ri-information-line" />
            </div>
            <p className="sync-alert-text">
              将本地 SQLite 数据单向同步到云端 PostgreSQL 或 MySQL 数据库。此操作适合数据备份或多端数据汇总。
            </p>
          </div>

          <div className="sync-form-card">
            <div className="sync-form-header">
              <i className="ri-server-line" />
              <span>数据库连接配置</span>
            </div>

            <div className="sync-form-body">
              <div className="sync-form-group full-width">
                <label className="sync-form-label">数据库类型</label>
                <div className="sync-db-type-selector">
                  {dbTypeOptions.map((option) => (
                    <button
                      className={`sync-db-type-option ${cloudConfig.db_type === option.value ? 'active' : ''}`}
                      key={option.value}
                      onClick={() => handleDbTypeChange(option.value)}
                      type="button"
                    >
                      <i className={option.icon} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sync-form-group full-width">
                <label className="sync-form-label">
                  <i className="ri-global-line" />
                  主机地址 (Host)
                </label>
                <input
                  className="sync-form-input"
                  onChange={(event) => updateConfig({ host: event.target.value })}
                  placeholder="例如: aws-0-ap-northeast-1.pooler.supabase.com"
                  type="text"
                  value={cloudConfig.host}
                />
              </div>

              <div className="sync-form-row">
                <div className="sync-form-group">
                  <label className="sync-form-label">
                    <i className="ri-hashtag" />
                    端口 (Port)
                  </label>
                  <input
                    className="sync-form-input"
                    onChange={(event) => updateConfig({ port: Number(event.target.value) })}
                    type="number"
                    value={cloudConfig.port}
                  />
                </div>
                <div className="sync-form-group">
                  <label className="sync-form-label">
                    <i className="ri-database-2-line" />
                    数据库名 (Database)
                  </label>
                  <input
                    className="sync-form-input"
                    onChange={(event) => updateConfig({ db_name: event.target.value })}
                    placeholder="例如: postgres"
                    type="text"
                    value={cloudConfig.db_name}
                  />
                </div>
              </div>

              <div className="sync-form-row">
                <div className="sync-form-group">
                  <label className="sync-form-label">
                    <i className="ri-user-line" />
                    用户名 (User)
                  </label>
                  <input
                    className="sync-form-input"
                    onChange={(event) => updateConfig({ user: event.target.value })}
                    type="text"
                    value={cloudConfig.user}
                  />
                </div>
                <div className="sync-form-group">
                  <label className="sync-form-label">
                    <i className="ri-lock-password-line" />
                    密码 (Password)
                  </label>
                  <input
                    className="sync-form-input"
                    onChange={(event) => updateConfig({ password: event.target.value })}
                    placeholder="••••••••"
                    type="password"
                    value={cloudConfig.password || ''}
                  />
                </div>
              </div>

              {cloudConfig.db_type === 'postgres' ? (
                <div className="sync-form-group full-width">
                  <label className="sync-form-label">
                    <i className="ri-shield-check-line" />
                    SSL 模式
                  </label>
                  <div className="sync-select-wrapper">
                    <select
                      className="sync-form-input sync-form-select"
                      onChange={(event) => updateConfig({ ssl_mode: event.target.value })}
                      value={cloudConfig.ssl_mode || 'require'}
                    >
                      <option value="disable">Disable</option>
                      <option value="require">Require (推荐)</option>
                      <option value="verify-full">Verify Full</option>
                    </select>
                    <i className="ri-arrow-down-s-line sync-select-arrow" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="sync-form-footer">
              <div className="sync-security-note">
                <i className="ri-shield-check-line" />
                <span>你的数据库凭据仅用于本地连接，不会发送到任何第三方服务器</span>
              </div>
              <button
                className="sync-action-btn primary"
                disabled={testLoading}
                onClick={() => void testConnection()}
                type="button"
              >
                {testLoading ? <i className="ri-loader-4-line animate-spin" /> : <span>测试连接并下一步</span>}
                {!testLoading ? <i className="ri-arrow-right-line" /> : null}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="sync-content">
          <div className="sync-connection-banner">
            <div className="sync-connection-info">
              <div className="sync-connection-icon-wrapper">
                <i className="ri-database-2-line" />
              </div>
              <div className="sync-connection-details">
                <div className="sync-connection-label">已连接至目标数据库</div>
                <div className="sync-connection-value">
                  <span className="sync-db-badge">
                    {cloudConfig.db_type === 'postgres' ? 'PostgreSQL' : 'MySQL'}
                  </span>
                  <span className="sync-connection-host">{cloudConfig.host}</span>
                  <span className="sync-connection-indicator">
                    <span className="sync-pulse" />
                    <span className="sync-dot" />
                  </span>
                </div>
              </div>
            </div>
            <div className="sync-connection-actions">
              <button
                className="sync-action-btn secondary"
                disabled={loading || syncLoading}
                onClick={() => void compareData()}
                type="button"
              >
                <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`} />
                <span>重新对比</span>
              </button>
              <button
                className="sync-action-btn primary"
                disabled={loading || syncLoading}
                onClick={() => void startSync()}
                type="button"
              >
                {syncLoading ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-upload-cloud-2-line" />}
                <span>开始同步</span>
              </button>
            </div>
          </div>

          <div className="sync-table-card">
            <div className="sync-table-header">
              <div className="sync-table-title">
                <i className="ri-file-list-3-line" />
                <span>数据对比明细</span>
                <span className="sync-table-badge">{compareResults.length} 个表</span>
              </div>
            </div>

            <div className="sync-table-body">
              {loading ? (
                <div className="sync-loading-state">
                  <div className="sync-loading-spinner">
                    <i className="ri-loader-4-line animate-spin" />
                  </div>
                  <span>正在分析数据库差异...</span>
                </div>
              ) : compareResults.length === 0 ? (
                <div className="sync-empty-state">
                  <div className="sync-empty-icon">
                    <i className="ri-inbox-archive-line" />
                  </div>
                  <h3 className="sync-empty-title">暂无对比数据</h3>
                  <p className="sync-empty-desc">请在上方点击「重新对比」按钮开始分析</p>
                </div>
              ) : (
                <div className="sync-data-grid">
                  {compareResults.map((result) => {
                    const syncResult = getSyncResultForTable(result.table_name)
                    return (
                      <div
                        className={`sync-data-row ${result.local_count !== result.remote_count ? 'has-diff' : ''} ${
                          syncResult?.success ? 'synced' : ''
                        }`}
                        key={result.table_name}
                      >
                        <div className="sync-row-main">
                          <div className="sync-table-icon">
                            <i className="ri-table-2" />
                          </div>
                          <div className="sync-table-info">
                            <div className="sync-table-name">{tableLabels[result.table_name] || result.table_name}</div>
                            <div className="sync-table-code">{result.table_name}</div>
                          </div>
                        </div>

                        <div className="sync-row-stats">
                          <div className="sync-stat-box">
                            <div className="sync-stat-box-label">本地</div>
                            <div className="sync-stat-box-value">{result.local_count}</div>
                          </div>
                          <div className="sync-stat-arrow">
                            <i className="ri-arrow-right-line" />
                          </div>
                          <div className={`sync-stat-box ${result.remote_count === -1 ? 'has-error' : ''}`}>
                            <div className="sync-stat-box-label">云端</div>
                            <div className="sync-stat-box-value">
                              {result.remote_count === -1 ? (
                                <span className="error-text">连接失败</span>
                              ) : (
                                <span>{result.remote_count}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="sync-row-status">
                          {result.local_count !== result.remote_count ? (
                            <span className="sync-status-badge warning">
                              <i className="ri-alert-line" />
                              <span>差异</span>
                            </span>
                          ) : (
                            <span className="sync-status-badge success">
                              <i className="ri-check-line" />
                              <span>一致</span>
                            </span>
                          )}
                        </div>

                        {syncResults.length ? (
                          <div className="sync-row-result">
                            {syncResult ? (
                              syncResult.success ? (
                                <div className="sync-result-success">
                                  <i className="ri-check-double-line" />
                                  <span>已同步 {syncResult.synced_count} 条</span>
                                </div>
                              ) : (
                                <div className="sync-result-error" title={syncResult.error_message}>
                                  <i className="ri-error-warning-line" />
                                  <span>同步失败</span>
                                </div>
                              )
                            ) : (
                              <span className="sync-result-pending">-</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
