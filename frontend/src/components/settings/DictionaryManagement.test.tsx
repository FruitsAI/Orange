import { act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dictionaryApi, type Dictionary, type DictionaryItem } from '@/api/dictionary'
import { render, screen, waitFor } from '@/test/render'
import DictionaryManagement from './DictionaryManagement'

vi.mock('@/api/dictionary', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/dictionary')>()
  return {
    ...original,
    dictionaryApi: {
      ...original.dictionaryApi,
      createItem: vi.fn(),
      deleteItem: vi.fn(),
      getItems: vi.fn(),
      list: vi.fn(),
      updateItem: vi.fn(),
    },
  }
})

const dictionaries = [
  { code: 'project_type', id: 1, name: '项目类型', remark: '', status: 1 },
  { code: 'payment_stage', id: 2, name: '收款阶段', remark: '', status: 1 },
] satisfies Dictionary[]

const dictionaryItem = (id: number, dictionaryId: number, label: string) =>
  ({
    dictionary_id: dictionaryId,
    id,
    label,
    sort: id,
    status: 1,
    value: label,
  }) satisfies DictionaryItem

const response = <T,>(data: T) => ({ data: { data } })

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

describe('DictionaryManagement request integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dictionaryApi.list).mockResolvedValue(response(dictionaries) as never)
    vi.mocked(dictionaryApi.getItems).mockResolvedValue(response([]) as never)
  })

  it('keeps the latest dictionary items when an older request resolves last', async () => {
    const firstRequest = deferred<ReturnType<typeof response<DictionaryItem[]>>>()
    const secondRequest = deferred<ReturnType<typeof response<DictionaryItem[]>>>()
    vi.mocked(dictionaryApi.getItems)
      .mockReset()
      .mockReturnValueOnce(firstRequest.promise as never)
      .mockReturnValueOnce(secondRequest.promise as never)
    const user = userEvent.setup()
    render(<DictionaryManagement />)

    await waitFor(() => expect(dictionaryApi.getItems).toHaveBeenCalledWith('project_type'))
    await user.click(screen.getByRole('tab', { name: /收款阶段/ }))
    await waitFor(() => expect(dictionaryApi.getItems).toHaveBeenCalledWith('payment_stage'))

    await act(async () => {
      secondRequest.resolve(response([dictionaryItem(2, 2, '尾款')]))
      await secondRequest.promise
    })
    expect(await screen.findAllByText('尾款')).toHaveLength(2)

    await act(async () => {
      firstRequest.resolve(response([dictionaryItem(1, 1, '软件项目')]))
      await firstRequest.promise
    })
    expect(screen.getAllByText('尾款')).toHaveLength(2)
    expect(screen.queryByText('软件项目')).not.toBeInTheDocument()
  })

  it('prevents duplicate dictionary items while a save is pending', async () => {
    const createRequest = deferred<unknown>()
    vi.mocked(dictionaryApi.createItem).mockReturnValue(createRequest.promise as never)
    const user = userEvent.setup()
    render(<DictionaryManagement />)

    await user.click(await screen.findByRole('button', { name: /新增条目/ }))
    await user.type(screen.getByLabelText('名称 (Label)'), '新条目')
    await user.type(screen.getByLabelText('值 (Value)'), 'new-item')
    const save = screen.getByRole('button', { name: '保存' })

    save.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    save.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(dictionaryApi.createItem).toHaveBeenCalledTimes(1)
    await act(async () => {
      createRequest.resolve(undefined)
      await createRequest.promise
    })
  })
})
