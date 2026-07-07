/**
 * @file composables/useConfirm.ts
 * @description Temporary React-compatible confirm API.
 */
interface ConfirmOptions {
  title?: string
  message: string
}

const formatMessage = (options: ConfirmOptions | string) => {
  if (typeof options === 'string') return options
  return options.title ? `${options.title}\n\n${options.message}` : options.message
}

export const useConfirm = () => {
  const confirm = async (options: ConfirmOptions | string): Promise<boolean> => {
    if (typeof window === 'undefined') return false
    return window.confirm(formatMessage(options))
  }

  return { confirm }
}

export default useConfirm
