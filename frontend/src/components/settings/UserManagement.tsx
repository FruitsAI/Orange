import { FormEvent, useCallback, useEffect, useState } from 'react'
import { authApi, type User } from '@/api/auth'
import GlassCard from '@/components/common/GlassCard'
import { useToastStore } from '@/composables/useToast'

export default function UserManagement() {
  const toast = useToastStore()
  const [users, setUsers] = useState<User[]>([])
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  const loadUsers = useCallback(async () => {
    try {
      const response = await authApi.getUsers({ page: 1, page_size: 50 })
      setUsers(response.data.data.list)
    } catch {
      toast.error('获取用户失败')
    }
  }, [toast])

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 0)
    return () => window.clearTimeout(timer)
  }, [loadUsers])

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await authApi.createUser({
        email: '',
        name,
        password,
        phone: '',
        role: 'user',
        username,
      })
      setUsername('')
      setName('')
      setPassword('')
      toast.success('用户已创建')
      await loadUsers()
    } catch {
      toast.error('创建用户失败')
    }
  }

  return (
    <GlassCard>
      <form className="inline-form" onSubmit={createUser}>
        <input onChange={(event) => setUsername(event.target.value)} placeholder="用户名" required value={username} />
        <input onChange={(event) => setName(event.target.value)} placeholder="姓名" required value={name} />
        <input
          onChange={(event) => setPassword(event.target.value)}
          placeholder="初始密码"
          required
          type="password"
          value={password}
        />
        <button className="btn btn-primary" type="submit">
          创建用户
        </button>
      </form>
      <div className="table-scroll-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>姓名</th>
              <th>角色</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.name}</td>
                <td>{user.role}</td>
                <td>{user.status === 1 ? '正常' : '禁用'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
