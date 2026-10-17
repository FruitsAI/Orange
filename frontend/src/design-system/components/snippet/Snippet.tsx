import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

export type SnippetSize = 'sm' | 'md' | 'lg'

export interface SnippetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onCopy'> {
  children: ReactNode
  copyLabel?: string
  copyValue?: string
  copiedLabel?: string
  disableCopy?: boolean
  hideSymbol?: boolean
  onCopyError?: () => void
  onCopySuccess?: (value: string) => void
  size?: SnippetSize
  symbol?: string
}

const COPY_RESET_MS = 1600

export const Snippet = forwardRef<HTMLDivElement, SnippetProps>(function Snippet(
  {
    children,
    className,
    copyLabel = '复制',
    copyValue,
    copiedLabel = '已复制',
    disableCopy = false,
    hideSymbol = false,
    onCopyError,
    onCopySuccess,
    size = 'md',
    symbol = '$',
    ...props
  },
  ref,
) {
  const [copied, setCopied] = useState(false)
  const activeRequest = useRef(0)
  const mounted = useRef(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      activeRequest.current += 1
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    const text = copyValue ?? preRef.current?.textContent ?? ''
    const request = ++activeRequest.current
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API is unavailable')
      await navigator.clipboard.writeText(text)
      if (!mounted.current || request !== activeRequest.current) return
      onCopySuccess?.(text)
      setCopied(true)
      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setCopied(false), COPY_RESET_MS)
    } catch {
      if (!mounted.current || request !== activeRequest.current) return
      onCopyError?.()
    }
  }, [copyValue, onCopyError, onCopySuccess])

  return (
    <div
      {...props}
      className={['ods-snippet', className].filter(Boolean).join(' ')}
      data-size={size}
      data-slot="snippet"
      ref={ref}
    >
      {hideSymbol ? null : (
        <span aria-hidden="true" className="ods-snippet__symbol" data-slot="symbol">
          {symbol}
        </span>
      )}
      <pre className="ods-snippet__content" data-slot="content" ref={preRef}>
        {children}
      </pre>
      {disableCopy ? null : (
        <button
          aria-label={copied ? copiedLabel : copyLabel}
          className="ods-snippet__copy"
          data-copied={copied || undefined}
          data-slot="copy"
          onClick={() => void handleCopy()}
          type="button"
        >
          <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
        </button>
      )}
    </div>
  )
})
