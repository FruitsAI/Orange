import { useCallback, useEffect, useMemo, useState } from 'react'
import { dictionaryApi, type Dictionary, type DictionaryItem } from '@/api/dictionary'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/composables/useToast'

interface DictionaryItemForm {
  id: number
  label: string
  sort: number
  value: string
}

const emptyForm: DictionaryItemForm = {
  id: 0,
  label: '',
  sort: 0,
  value: '',
}

export default function DictionaryManagement() {
  const { confirm } = useConfirm()
  const toastError = useToastStore((state) => state.error)
  const toastSuccess = useToastStore((state) => state.success)
  const toastWarning = useToastStore((state) => state.warning)
  const [activeDictId, setActiveDictId] = useState('')
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([])
  const [activeDictItems, setActiveDictItems] = useState<DictionaryItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [modalForm, setModalForm] = useState<DictionaryItemForm>(emptyForm)

  const activeDictName = useMemo(() => {
    const dictionary = dictionaries.find((item) => item.code === activeDictId)
    return dictionary?.name || activeDictId
  }, [activeDictId, dictionaries])

  const fetchDictItems = useCallback(
    async (code: string) => {
      if (!code) return
      try {
        const response = await dictionaryApi.getItems(code)
        setActiveDictItems(response.data.data)
      } catch {
        toastError('获取字典项失败')
      }
    },
    [toastError],
  )

  const fetchDictionaries = useCallback(async () => {
    try {
      const response = await dictionaryApi.list()
      const nextDictionaries = response.data.data
      setDictionaries(nextDictionaries)
      setActiveDictId((current) => current || nextDictionaries[0]?.code || '')
    } catch {
      toastError('获取字典失败')
    }
  }, [toastError])

  useEffect(() => {
    const timer = window.setTimeout(fetchDictionaries, 0)
    return () => window.clearTimeout(timer)
  }, [fetchDictionaries])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDictItems(activeDictId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeDictId, fetchDictItems])

  const openAddModal = () => {
    setIsEditing(false)
    setModalForm({
      ...emptyForm,
      sort: activeDictItems.length + 1,
    })
    setShowModal(true)
  }

  const openEditModal = (item: DictionaryItem) => {
    setIsEditing(true)
    setModalForm({
      id: item.id,
      label: item.label,
      sort: item.sort,
      value: item.value,
    })
    setShowModal(true)
  }

  const handleModalSubmit = async () => {
    if (!activeDictId) return

    const label = modalForm.label.trim()
    const value = modalForm.value.trim()
    if (!label || !value) {
      toastWarning('请输入名称和值')
      return
    }

    try {
      if (isEditing) {
        await dictionaryApi.updateItem(activeDictId, modalForm.id, {
          label,
          sort: modalForm.sort,
          value,
        })
      } else {
        await dictionaryApi.createItem(activeDictId, {
          label,
          sort: modalForm.sort,
          value,
        })
      }

      toastSuccess(isEditing ? '修改成功' : '添加成功')
      setShowModal(false)
      await fetchDictItems(activeDictId)
    } catch {
      toastError(isEditing ? '修改失败' : '添加失败')
    }
  }

  const deleteDictItem = async (id: number) => {
    if (!activeDictId) return

    const confirmed = await confirm('确定要删除这个选项吗？')
    if (!confirmed) return

    try {
      await dictionaryApi.deleteItem(activeDictId, id)
      await fetchDictItems(activeDictId)
      toastSuccess('删除成功')
    } catch {
      toastError('删除失败')
    }
  }

  return (
    <div className="dict-management">
      <div className="dev-header">
        <div className="dev-header-content">
          <div className="dev-title-section">
            <div className="dev-icon-wrapper">
              <i className="ri-book-2-line" />
            </div>
            <div className="dev-title-info">
              <h2 className="dev-title">字典管理</h2>
              <p className="dev-subtitle">管理系统数据字典和配置项</p>
            </div>
          </div>
          <button className="dev-create-btn" disabled={!activeDictId} onClick={openAddModal} type="button">
            <i className="ri-add-line" />
            <span>新增条目</span>
          </button>
        </div>

        <div className="dev-stats">
          <div className="dev-stat-card">
            <div className="dev-stat-icon total">
              <i className="ri-folder-line" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{dictionaries.length}</span>
              <span className="dev-stat-label">字典分类</span>
            </div>
          </div>
          <div className="dev-stat-card">
            <div className="dev-stat-icon items">
              <i className="ri-list-check" />
            </div>
            <div className="dev-stat-info">
              <span className="dev-stat-value">{activeDictItems.length}</span>
              <span className="dev-stat-label">当前条目</span>
            </div>
          </div>
          {activeDictId ? (
            <div className="dev-stat-card">
              <div className="dev-stat-icon active">
                <i className="ri-bookmark-line" />
              </div>
              <div className="dev-stat-info">
                <span className="dev-stat-value">{activeDictName}</span>
                <span className="dev-stat-label">当前字典</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="dict-layout">
        <div className="dict-sidebar">
          <div className="dict-sidebar-title">字典分类</div>
          {dictionaries.map((dictionary) => (
            <div
              className={`dict-nav-item ${activeDictId === dictionary.code ? 'active' : ''}`}
              key={dictionary.id}
              onKeyUp={(event) => {
                if (event.key === 'Enter') setActiveDictId(dictionary.code)
              }}
              onClick={() => setActiveDictId(dictionary.code)}
              role="button"
              tabIndex={0}
            >
              <i className="ri-folder-2-line" />
              <span>{dictionary.name}</span>
            </div>
          ))}
        </div>

        <div className="dict-content">
          {activeDictItems.length === 0 ? (
            <div className="dict-empty">
              <div className="dict-empty-icon">
                <i className="ri-file-list-3-line" />
              </div>
              <h3 className="dict-empty-title">暂无数据</h3>
              <p className="dict-empty-desc">点击右上角按钮添加新条目</p>
            </div>
          ) : (
            <div className="dict-list">
              {activeDictItems.map((item) => (
                <div className="dict-item-card" key={item.id}>
                  <div className="dict-item-icon">
                    <i className="ri-price-tag-3-line" />
                  </div>
                  <div className="dict-item-info">
                    <span className="dict-item-label">{item.label}</span>
                    <span className="dict-item-value">{item.value}</span>
                  </div>
                  <div className="dict-item-actions">
                    <button className="action-btn edit" onClick={() => openEditModal(item)} title="编辑" type="button">
                      <i className="ri-edit-line" />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => void deleteDictItem(item.id)}
                      title="删除"
                      type="button"
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal ? (
        <div className="modal-overlay open" onClick={() => setShowModal(false)} role="presentation">
          <div className="modal open" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div
              className="modal-header"
              style={{
                borderBottom: '1px solid var(--separator-color)',
                marginBottom: 24,
                paddingBottom: 16,
              }}
            >
              <h3 className="modal-title">{isEditing ? '编辑条目' : '新增条目'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} type="button">
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-md">
                <label className="form-label">名称 (Label)</label>
                <input
                  autoComplete="off"
                  className="form-input"
                  onChange={(event) => setModalForm((current) => ({ ...current, label: event.target.value }))}
                  spellCheck={false}
                  type="text"
                  value={modalForm.label}
                />
              </div>
              <div className="form-group mb-md">
                <label className="form-label">值 (Value)</label>
                <input
                  autoComplete="off"
                  className="form-input"
                  onChange={(event) => setModalForm((current) => ({ ...current, value: event.target.value }))}
                  spellCheck={false}
                  type="text"
                  value={modalForm.value}
                />
              </div>
              <div className="form-group mb-md">
                <label className="form-label">排序 (Sort)</label>
                <input
                  autoComplete="off"
                  className="form-input"
                  onChange={(event) => setModalForm((current) => ({ ...current, sort: Number(event.target.value) }))}
                  spellCheck={false}
                  type="number"
                  value={modalForm.sort}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} type="button">
                取消
              </button>
              <button className="btn btn-primary" onClick={() => void handleModalSubmit()} type="button">
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
