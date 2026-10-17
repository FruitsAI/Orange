import type { MouseEvent } from 'react'
import { Window } from '@wailsio/runtime'

const interactiveSelector = 'a, button, input, select, textarea, [role="dialog"]'

export const handleWindowDragRegionDoubleClick = (event: MouseEvent<HTMLElement>) => {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest(interactiveSelector)) return
  if (window.getComputedStyle(target).getPropertyValue('--wails-draggable').trim() !== 'drag')
    return

  try {
    void Window.ToggleMaximise().catch(() => {})
  } catch {
    // The browser preview has no native Wails window transport.
  }
}
