import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { syncApi, type SyncConfig, type SyncResult, type TableCompareResult } from '@/api/sync'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'
import {
  Alert,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Radio,
  RadioGroup,
  SectionHeader,
  Select,
  Spinner,
  Surface,
  Table,
} from '@/design-system'

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
  const syncedCount = useMemo(
    () => syncResults.filter((result) => result.success).length,
    [syncResults],
  )

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
      actionLabel: '开始同步',
      actionVariant: 'danger',
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
      <div className="settings-panel-header">
        <SectionHeader
          actions={
            step !== 'config' ? (
              <Button onClick={() => setStep('config')} variant="secondary">
                <i className="ri-settings-3-line" />
                <span>修改配置</span>
              </Button>
            ) : null
          }
          description="将本地 SQLite 数据同步到云端 PostgreSQL 或 MySQL 数据库"
          icon={<i className="ri-cloud-line" />}
          iconTone="info"
          size="lg"
          title="数据同步"
        />

        <div className="sync-stats">
          <Card.Root className="sync-stat-item" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="sync-stat-icon" padding="none" radius="control" tone="info">
              <i className="ri-database-2-line" />
            </Surface>
            <div className="sync-stat-info">
              <span className="sync-stat-value">{compareResults.length}</span>
              <span className="sync-stat-label">数据表</span>
            </div>
          </Card.Root>
          <Card.Root className="sync-stat-item" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="sync-stat-icon" padding="none" radius="control" tone="warning">
              <i className="ri-exchange-line" />
            </Surface>
            <div className="sync-stat-info">
              <span className="sync-stat-value">{diffCount}</span>
              <span className="sync-stat-label">待同步</span>
            </div>
          </Card.Root>
          <Card.Root className="sync-stat-item" gap="sm" orientation="horizontal" padding="sm">
            <Surface className="sync-stat-icon" padding="none" radius="control" tone="success">
              <i className="ri-check-double-line" />
            </Surface>
            <div className="sync-stat-info">
              <span className="sync-stat-value">{syncedCount}</span>
              <span className="sync-stat-label">已同步</span>
            </div>
          </Card.Root>
        </div>
      </div>

      {step === 'config' ? (
        <div className="sync-content">
          <Alert icon={<i className="ri-information-line" />} title="单向云端同步" tone="info">
            将本地 SQLite 数据单向同步到云端 PostgreSQL 或 MySQL
            数据库。此操作适合数据备份或多端数据汇总。
          </Alert>

          <Card.Root gap="lg" padding="lg">
            <Card.Header>
              <SectionHeader
                density="compact"
                headingLevel={3}
                icon={<i className="ri-server-line" />}
                iconTone="info"
                title="数据库连接配置"
              />
            </Card.Header>

            <Card.Content>
              <FormSection>
                <RadioGroup
                  aria-label="数据库类型"
                  columns={2}
                  onValueChange={handleDbTypeChange}
                  value={cloudConfig.db_type}
                >
                  <RadioGroup.Legend>数据库类型</RadioGroup.Legend>
                  {dbTypeOptions.map((option) => (
                    <Radio key={option.value} value={option.value} variant="card">
                      <span className="sync-db-option-content">
                        <i className={option.icon} />
                        <span>{option.label}</span>
                      </span>
                    </Radio>
                  ))}
                </RadioGroup>

                <Field.Root>
                  <Field.Label>
                    <i className="ri-global-line" />
                    主机地址 (Host)
                  </Field.Label>
                  <Input
                    onChange={(event) => updateConfig({ host: event.target.value })}
                    placeholder="例如: aws-0-ap-northeast-1.pooler.supabase.com"
                    type="text"
                    value={cloudConfig.host}
                  />
                </Field.Root>

                <FormGrid columns={2}>
                  <Field.Root>
                    <Field.Label>
                      <i className="ri-hashtag" />
                      端口 (Port)
                    </Field.Label>
                    <Input
                      onChange={(event) => updateConfig({ port: Number(event.target.value) })}
                      type="number"
                      value={cloudConfig.port}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>
                      <i className="ri-database-2-line" />
                      数据库名 (Database)
                    </Field.Label>
                    <Input
                      onChange={(event) => updateConfig({ db_name: event.target.value })}
                      placeholder="例如: postgres"
                      type="text"
                      value={cloudConfig.db_name}
                    />
                  </Field.Root>
                </FormGrid>

                <FormGrid columns={2}>
                  <Field.Root>
                    <Field.Label>
                      <i className="ri-user-line" />
                      用户名 (User)
                    </Field.Label>
                    <Input
                      onChange={(event) => updateConfig({ user: event.target.value })}
                      type="text"
                      value={cloudConfig.user}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>
                      <i className="ri-lock-password-line" />
                      密码 (Password)
                    </Field.Label>
                    <Input
                      onChange={(event) => updateConfig({ password: event.target.value })}
                      placeholder="••••••••"
                      type="password"
                      value={cloudConfig.password || ''}
                    />
                  </Field.Root>
                </FormGrid>

                {cloudConfig.db_type === 'postgres' ? (
                  <Field.Root>
                    <Field.Label>
                      <i className="ri-shield-check-line" />
                      SSL 模式
                    </Field.Label>
                    <Select
                      aria-label="SSL 模式"
                      onValueChange={(value) => updateConfig({ ssl_mode: value })}
                      options={[
                        { label: 'Disable', value: 'disable' },
                        { label: 'Require (推荐)', value: 'require' },
                        { label: 'Verify Full', value: 'verify-full' },
                      ]}
                      value={cloudConfig.ssl_mode || 'require'}
                    />
                  </Field.Root>
                ) : null}
              </FormSection>
            </Card.Content>

            <Card.Footer>
              <FormActions align="between" className="sync-form-actions">
                <Card.Description>
                  <i className="ri-shield-check-line" />
                  <span>你的数据库凭据仅用于本地连接，不会发送到任何第三方服务器</span>
                </Card.Description>
                <Button onClick={() => void testConnection()} pending={testLoading}>
                  <span>{testLoading ? '正在测试...' : '测试连接并下一步'}</span>
                  {!testLoading ? <i className="ri-arrow-right-line" /> : null}
                </Button>
              </FormActions>
            </Card.Footer>
          </Card.Root>
        </div>
      ) : (
        <div className="sync-content">
          <Card.Root
            className="sync-connection-banner"
            gap="sm"
            orientation="horizontal"
            padding="sm"
            tone="success"
          >
            <div className="sync-connection-info">
              <Surface
                className="sync-connection-icon-wrapper"
                padding="none"
                radius="control"
                tone="success"
              >
                <i className="ri-database-2-line" />
              </Surface>
              <div className="sync-connection-details">
                <div className="sync-connection-label">已连接至目标数据库</div>
                <div className="sync-connection-value">
                  <Chip size="sm" tone="success">
                    {cloudConfig.db_type === 'postgres' ? 'PostgreSQL' : 'MySQL'}
                  </Chip>
                  <span className="sync-connection-host">{cloudConfig.host}</span>
                  <span className="sync-connection-indicator">
                    <span className="sync-pulse" />
                    <span className="sync-dot" />
                  </span>
                </div>
              </div>
            </div>
            <div className="sync-connection-actions">
              <Button
                disabled={loading || syncLoading}
                onClick={() => void compareData()}
                variant="secondary"
              >
                <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`} />
                <span>重新对比</span>
              </Button>
              <Button disabled={loading} onClick={() => void startSync()} pending={syncLoading}>
                {!syncLoading ? <i className="ri-upload-cloud-2-line" /> : null}
                <span>开始同步</span>
              </Button>
            </div>
          </Card.Root>

          <Card.Root gap="lg" padding="lg">
            <Card.Header>
              <SectionHeader
                actions={<Chip size="sm">{compareResults.length} 个表</Chip>}
                density="compact"
                headingLevel={3}
                icon={<i className="ri-file-list-3-line" />}
                title="数据对比明细"
              />
            </Card.Header>

            <Card.Content>
              {loading ? (
                <Spinner className="sync-loading-state" label="正在分析数据库差异" size="lg" />
              ) : compareResults.length === 0 ? (
                <EmptyState
                  className="sync-empty-state"
                  description="请在上方点击「重新对比」按钮开始分析"
                  icon={<i className="ri-inbox-archive-line" />}
                  title="暂无对比数据"
                />
              ) : (
                <Table.Root aria-label="数据对比明细">
                  <Table.Header>
                    <Table.Row>
                      <Table.Column>数据表</Table.Column>
                      <Table.Column align="center">本地</Table.Column>
                      <Table.Column align="center">云端</Table.Column>
                      <Table.Column align="center">状态</Table.Column>
                      <Table.Column align="end">同步结果</Table.Column>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {compareResults.map((result) => {
                      const syncResult = getSyncResultForTable(result.table_name)
                      return (
                        <Table.Row key={result.table_name}>
                          <Table.Cell>
                            <div className="sync-table-identity">
                              <Surface
                                className="sync-table-icon"
                                padding="sm"
                                radius="control"
                                tone="accent"
                              >
                                <i className="ri-table-2" />
                              </Surface>
                              <div className="sync-table-info">
                                <div className="sync-table-name">
                                  {tableLabels[result.table_name] || result.table_name}
                                </div>
                                <div className="sync-table-code">{result.table_name}</div>
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell align="center">{result.local_count}</Table.Cell>
                          <Table.Cell align="center">
                            {result.remote_count === -1 ? (
                              <Chip size="sm" tone="danger">
                                连接失败
                              </Chip>
                            ) : (
                              result.remote_count
                            )}
                          </Table.Cell>
                          <Table.Cell align="center">
                            {result.local_count !== result.remote_count ? (
                              <Chip size="sm" tone="warning">
                                <i className="ri-alert-line" />
                                <span>差异</span>
                              </Chip>
                            ) : (
                              <Chip size="sm" tone="success">
                                <i className="ri-check-line" />
                                <span>一致</span>
                              </Chip>
                            )}
                          </Table.Cell>
                          <Table.Cell align="end">
                            {syncResult ? (
                              syncResult.success ? (
                                <span className="sync-result-success">
                                  <i className="ri-check-double-line" />
                                  <span>已同步 {syncResult.synced_count} 条</span>
                                </span>
                              ) : (
                                <span
                                  className="sync-result-error"
                                  title={syncResult.error_message}
                                >
                                  <i className="ri-error-warning-line" />
                                  <span>同步失败</span>
                                </span>
                              )
                            ) : (
                              <span className="sync-result-pending">—</span>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      )
                    })}
                  </Table.Body>
                </Table.Root>
              )}
            </Card.Content>
          </Card.Root>
        </div>
      )}
    </div>
  )
}
