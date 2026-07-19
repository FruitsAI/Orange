import { forwardRef, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

export type InputOtpSize = 'sm' | 'md' | 'lg'

export interface InputOtpProps {
  'aria-label'?: string
  allowedKeys?: RegExp
  className?: string
  disabled?: boolean
  length?: number
  onValueChange: (value: string) => void
  size?: InputOtpSize
  value: string
}

const DEFAULT_ALLOWED = /^[0-9]$/

export const InputOtp = forwardRef<HTMLDivElement, InputOtpProps>(function InputOtp(
  {
    'aria-label': ariaLabel = '验证码',
    allowedKeys = DEFAULT_ALLOWED,
    className,
    disabled = false,
    length = 6,
    onValueChange,
    size = 'md',
    value,
    ...props
  },
  ref,
) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  const focusInput = (index: number) => {
    const target = inputsRef.current[Math.min(Math.max(index, 0), length - 1)]
    target?.focus()
    target?.select()
  }

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice()
    next[index] = digit
    onValueChange(next.join('').slice(0, length))
  }

  const handleChange = (index: number, raw: string) => {
    const char = raw.slice(-1)
    if (char && !allowedKeys.test(char)) return
    setDigit(index, char)
    if (char) focusInput(index + 1)
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (digits[index]) {
        setDigit(index, '')
      } else {
        event.preventDefault()
        setDigit(index - 1, '')
        focusInput(index - 1)
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusInput(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusInput(index + 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData
      .getData('text')
      .split('')
      .filter((char) => allowedKeys.test(char))
      .join('')
      .slice(0, length)
    if (pasted) {
      onValueChange(pasted)
      focusInput(pasted.length)
    }
  }

  return (
    <div
      {...props}
      aria-label={ariaLabel}
      className={['ods-input-otp', className].filter(Boolean).join(' ')}
      data-size={size}
      data-slot="input-otp"
      ref={ref}
      role="group"
    >
      {digits.map((digit, index) => (
        <input
          aria-label={`${ariaLabel} ${index + 1}`}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          className="ods-input-otp__slot"
          data-filled={digit ? '' : undefined}
          data-slot="slot"
          disabled={disabled}
          inputMode="numeric"
          key={index}
          onChange={(event) => handleChange(index, event.target.value)}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          ref={(node) => {
            inputsRef.current[index] = node
          }}
          value={digit}
        />
      ))}
    </div>
  )
})
