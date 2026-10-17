import { useEffect, useRef, type RefObject } from 'react'
import {
  getOverlayLayerDescendantElements,
  isTopOverlayLayer,
  setOverlayLayerElement,
  useOverlayLayer,
} from './overlayStack'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')
const dialogStack: symbol[] = []

interface DialogFocusOptions {
  closeOnEscape?: boolean
  dialogRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
  open: boolean
}

export function useDialogFocus({
  closeOnEscape = true,
  dialogRef,
  initialFocusRef,
  onClose,
  open,
}: DialogFocusOptions) {
  const onCloseRef = useRef(onClose)
  const { token: overlayToken, zIndex } = useOverlayLayer({ kind: 'dialog', open })

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    setOverlayLayerElement(overlayToken, dialogRef.current)
    return () => setOverlayLayerElement(overlayToken, null)
  }, [dialogRef, open, overlayToken])

  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const dialogToken = Symbol('dialog')
    dialogStack.push(dialogToken)
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const getFocusableElements = () => {
      const containers = [dialog, ...getOverlayLayerDescendantElements(overlayToken)].filter(
        (element): element is HTMLElement => Boolean(element),
      )
      const focusable = containers.flatMap((container) => {
        const descendants = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
        return container.matches(focusableSelector) ? [container, ...descendants] : descendants
      })
      return Array.from(new Set(focusable))
    }

    const activeElement = document.activeElement
    const focusAlreadyManaged =
      activeElement instanceof Node &&
      (dialog?.contains(activeElement) ||
        getOverlayLayerDescendantElements(overlayToken).some((element) =>
          element.contains(activeElement),
        ))
    if (!focusAlreadyManaged) {
      const initialFocus = initialFocusRef?.current ?? getFocusableElements()[0] ?? dialog
      initialFocus?.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!closeOnEscape || !isTopOverlayLayer(overlayToken)) return
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (dialogStack.at(-1) !== dialogToken) return
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement
      const focusIsManaged = focusableElements.some((element) => element === activeElement)
      if (event.shiftKey && (activeElement === first || !focusIsManaged)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (activeElement === last || !focusIsManaged)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const wasTopmost = dialogStack.at(-1) === dialogToken
      const stackIndex = dialogStack.lastIndexOf(dialogToken)
      if (stackIndex >= 0) dialogStack.splice(stackIndex, 1)
      if (wasTopmost) previouslyFocused?.focus()
    }
  }, [closeOnEscape, dialogRef, initialFocusRef, open, overlayToken])

  return { overlayToken, zIndex }
}
