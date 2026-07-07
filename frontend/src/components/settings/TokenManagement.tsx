import { FormEvent, useCallback, useEffect, useState } from 'react'
import { tokenApi, type PersonalAccessToken } from '@/api/token'
import GlassCard from '@/components/common/GlassCard'
import { useToastStore } from '@/composables/useToast'

export default function TokenManagement() {
  const toast = useToastStore()
  const [tokens, setTokens] = useState<PersonalAccessToken[]>([])
  const [name, setName] = useState('')
  const [expiresIn, setExpiresIn] = useState(30)
  const [createdToken, setCreatedToken] = useState('')

  const loadTokens = useCallback(async () => {
    try {
      const response = await tokenApi.list()
      setTokens(response.data.data)
    } catch {
      toast.error('获取令牌失败')
    }
  }, [toast])

  useEffect(() => {
    const timer = window.setTimeout(loadTokens, 0)
    return () => window.clearTimeout(timer)
  }, [loadTokens])

  const createToken = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const response = await tokenApi.create({ expires_in: expiresIn, name })
      setCreatedToken(response.data.data.token)
      setName('')
      toast.success('令牌已创建')
      await loadTokens()
    } catch {
      toast.error('创建令牌失败')
    }
  }

  const revokeToken = async (id: number) => {
    try {
      await tokenApi.revoke(id)
      toast.success('令牌已撤销')
      await loadTokens()
    } catch {
      toast.error('撤销令牌失败')
    }
  }

  return (
    <GlassCard>
      <form className="inline-form" onSubmit={createToken}>
        <input onChange={(event) => setName(event.target.value)} placeholder="令牌名称" required value={name} />
        <input
          min="1"
          onChange={(event) => setExpiresIn(Number(event.target.value))}
          type="number"
          value={expiresIn}
        />
        <button className="btn btn-primary" type="submit">
          创建令牌
        </button>
      </form>
      {createdToken ? (
        <div className="notice-box">
          <strong>新令牌只显示一次：</strong>
          <code>{createdToken}</code>
        </div>
      ) : null}
      <div className="table-scroll-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>状态</th>
              <th>过期时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id}>
                <td>{token.name}</td>
                <td>{token.status === 1 ? '启用' : '已撤销'}</td>
                <td>{token.expires_at || '-'}</td>
                <td>
                  {token.status === 1 ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => revokeToken(token.id)} type="button">
                      撤销
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
