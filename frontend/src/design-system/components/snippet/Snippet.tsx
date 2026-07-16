import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

export type SnippetSize = 'sm' | 'md' | 'lg'

export interface SnippetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: ReactNode
  copyLabel?: string
  copyValue?: string
  copiedLabel?: string
  disableCopy?: boolean
  hideSymbol?: boolean
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
    size = 'md',
    symbol = '$',
    ...props
  },
  ref,
) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const preRef = useRef<HTMLPreElement>(null)

  const handleCopy = useCallback(() => {
    const text = copyValue ?? preRef.current?.textContent ?? ''
    void navigator.clipboard?.writeText(text)
    setCopied(true)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopied(false), COPY_RESET_MS)
  }, [copyValue])

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
          onClick={handleCopy}
          type="button"
        >
          <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
        </button>
      )}
    </div>
  )
})
