import { FormEvent, useCallback, useEffect, useState } from 'react'
import { dictionaryApi, type Dictionary, type DictionaryItem } from '@/api/dictionary'
import GlassCard from '@/components/common/GlassCard'
import { useToastStore } from '@/composables/useToast'

export default function DictionaryManagement() {
  const toast = useToastStore()
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([])
  const [activeCode, setActiveCode] = useState('')
  const [items, setItems] = useState<DictionaryItem[]>([])
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')

  const loadDictionaries = useCallback(async () => {
    try {
      const response = await dictionaryApi.list()
      setDictionaries(response.data.data)
      setActiveCode((current) => current || response.data.data[0]?.code || '')
    } catch {
      toast.error('获取字典失败')
    }
  }, [toast])

  const loadItems = useCallback(async () => {
    if (!activeCode) return
    try {
      const response = await dictionaryApi.getItems(activeCode)
      setItems(response.data.data)
    } catch {
      toast.error('获取字典项失败')
    }
  }, [activeCode, toast])

  useEffect(() => {
    const timer = window.setTimeout(loadDictionaries, 0)
    return () => window.clearTimeout(timer)
  }, [loadDictionaries])

  useEffect(() => {
    const timer = window.setTimeout(loadItems, 0)
    return () => window.clearTimeout(timer)
  }, [loadItems])

  const createItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await dictionaryApi.createItem(activeCode, { label, value })
      setLabel('')
      setValue('')
      toast.success('字典项已创建')
      await loadItems()
    } catch {
      toast.error('创建字典项失败')
    }
  }

  const deleteItem = async (id: number) => {
    try {
      await dictionaryApi.deleteItem(activeCode, id)
      toast.success('字典项已删除')
      await loadItems()
    } catch {
      toast.error('删除字典项失败')
    }
  }

  return (
    <GlassCard>
      <div className="page-toolbar">
        <select onChange={(event) => setActiveCode(event.target.value)} value={activeCode}>
          {dictionaries.map((dictionary) => (
            <option key={dictionary.code} value={dictionary.code}>
              {dictionary.name}
            </option>
          ))}
        </select>
      </div>
      <form className="inline-form" onSubmit={createItem}>
        <input onChange={(event) => setLabel(event.target.value)} placeholder="显示名称" required value={label} />
        <input onChange={(event) => setValue(event.target.value)} placeholder="值" required value={value} />
        <button className="btn btn-primary" disabled={!activeCode} type="submit">
          新增
        </button>
      </form>
      <div className="table-scroll-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>值</th>
              <th>排序</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.label}</td>
                <td>{item.value}</td>
                <td>{item.sort}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(item.id)} type="button">
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}
