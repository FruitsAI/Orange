import { forwardRef, type HTMLAttributes } from 'react'

const KEY_GLYPHS: Record<string, string> = {
  command: '⌘',
  shift: '⇧',
  ctrl: '⌃',
  option: '⌥',
  alt: '⌥',
  enter: '↵',
  delete: '⌫',
  escape: '⎋',
  tab: '⇥',
  capslock: '⇪',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
}

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  keys?: string | string[]
}

export const Kbd = forwardRef<HTMLElement, KbdProps>(function Kbd(
  { children, className, keys, ...props },
  ref,
) {
  const keyList = keys === undefined ? [] : Array.isArray(keys) ? keys : [keys]

  return (
    <kbd
      {...props}
      className={['ods-kbd', className].filter(Boolean).join(' ')}
      data-slot="kbd"
      ref={ref}
    >
      {keyList.map((key) => (
        <abbr key={key} className="ods-kbd__key" data-slot="key" title={key}>
          {KEY_GLYPHS[key.toLowerCase()] ?? key}
        </abbr>
      ))}
      {children ? <span className="ods-kbd__label">{children}</span> : null}
    </kbd>
  )
})
