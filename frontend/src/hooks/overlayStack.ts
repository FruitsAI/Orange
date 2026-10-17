import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react'

export type OverlayLayerKind = 'dialog' | 'popover'
export type OverlayLayerToken = symbol

interface OverlayLayerEntry {
  kind: OverlayLayerKind
  order: number
  parentToken: OverlayLayerToken | null
  token: OverlayLayerToken
}

interface OverlayLayerRegistration {
  kind?: OverlayLayerKind
  parentToken?: OverlayLayerToken | null
  token?: OverlayLayerToken
}

interface UseOverlayLayerOptions {
  kind: OverlayLayerKind
  open: boolean
}

const OverlayLayerContext = createContext<OverlayLayerToken | null>(null)
const overlayLayers: OverlayLayerEntry[] = []
const layerElements = new Map<OverlayLayerToken, HTMLElement>()
const listeners = new Set<() => void>()
let nextOrder = 0

export const OverlayLayerProvider = OverlayLayerContext.Provider

export const createOverlayLayerToken = (): OverlayLayerToken => Symbol('overlay-layer')

const notifyListeners = () => {
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getOrderedLayers = () => {
  const entriesByToken = new Map(overlayLayers.map((entry) => [entry.token, entry]))
  const childrenByParent = new Map<OverlayLayerToken, OverlayLayerEntry[]>()
  const roots: OverlayLayerEntry[] = []

  for (const entry of overlayLayers) {
    if (entry.parentToken && entriesByToken.has(entry.parentToken)) {
      const siblings = childrenByParent.get(entry.parentToken) ?? []
      siblings.push(entry)
      childrenByParent.set(entry.parentToken, siblings)
    } else {
      roots.push(entry)
    }
  }

  const byOpenOrder = (left: OverlayLayerEntry, right: OverlayLayerEntry) =>
    left.order - right.order
  roots.sort(byOpenOrder)
  for (const children of childrenByParent.values()) children.sort(byOpenOrder)

  const ordered: OverlayLayerEntry[] = []
  const visited = new Set<OverlayLayerToken>()
  const visit = (entry: OverlayLayerEntry) => {
    if (visited.has(entry.token)) return
    visited.add(entry.token)
    ordered.push(entry)
    for (const child of childrenByParent.get(entry.token) ?? []) visit(child)
  }

  for (const root of roots) visit(root)
  // A cycle would be a component bug, but keeping every registered layer here
  // makes cleanup and Escape handling deterministic even in that case.
  for (const entry of overlayLayers) visit(entry)
  return ordered
}

const isDialogScoped = (
  entry: OverlayLayerEntry,
  entriesByToken: Map<OverlayLayerToken, OverlayLayerEntry>,
) => {
  let current: OverlayLayerEntry | undefined = entry
  const visited = new Set<OverlayLayerToken>()
  while (current && !visited.has(current.token)) {
    if (current.kind === 'dialog') return true
    visited.add(current.token)
    current = current.parentToken ? entriesByToken.get(current.parentToken) : undefined
  }
  return false
}

const getScopedLayers = () => {
  const ordered = getOrderedLayers()
  const entriesByToken = new Map(ordered.map((entry) => [entry.token, entry]))
  return {
    dialog: ordered.filter((entry) => isDialogScoped(entry, entriesByToken)),
    popover: ordered.filter((entry) => !isDialogScoped(entry, entriesByToken)),
  }
}

export const registerOverlayLayer = ({
  kind = 'popover',
  parentToken = null,
  token = createOverlayLayerToken(),
}: OverlayLayerRegistration = {}) => {
  const existing = overlayLayers.find((entry) => entry.token === token)
  if (existing) {
    existing.kind = kind
    existing.parentToken = parentToken
  } else {
    overlayLayers.push({ kind, order: nextOrder++, parentToken, token })
  }
  notifyListeners()
  return token
}

export const unregisterOverlayLayer = (token: OverlayLayerToken) => {
  const index = overlayLayers.findIndex((entry) => entry.token === token)
  if (index >= 0) {
    overlayLayers.splice(index, 1)
    layerElements.delete(token)
    notifyListeners()
  }
}

export const setOverlayLayerElement = (token: OverlayLayerToken, element: HTMLElement | null) => {
  if (element) layerElements.set(token, element)
  else layerElements.delete(token)
}

export const isTopOverlayLayer = (token: OverlayLayerToken) => {
  const scopedLayers = getScopedLayers()
  return (scopedLayers.dialog.at(-1) ?? scopedLayers.popover.at(-1))?.token === token
}

export const getOverlayLayerDescendantElements = (token: OverlayLayerToken) => {
  const entriesByToken = new Map(overlayLayers.map((entry) => [entry.token, entry]))
  const isDescendant = (entry: OverlayLayerEntry) => {
    let parentToken = entry.parentToken
    const visited = new Set<OverlayLayerToken>()
    while (parentToken && !visited.has(parentToken)) {
      if (parentToken === token) return true
      visited.add(parentToken)
      parentToken = entriesByToken.get(parentToken)?.parentToken ?? null
    }
    return false
  }

  return getOrderedLayers()
    .filter(isDescendant)
    .map((entry) => layerElements.get(entry.token))
    .filter((element): element is HTMLElement => Boolean(element))
}

export const isElementInOverlayLayerSubtree = (token: OverlayLayerToken, target: Node) => {
  const ownElement = layerElements.get(token)
  if (ownElement?.contains(target)) return true
  return getOverlayLayerDescendantElements(token).some((element) => element.contains(target))
}

const getOverlayLayerZIndex = (token: OverlayLayerToken, fallbackKind: OverlayLayerKind) => {
  const scopedLayers = getScopedLayers()
  const dialogIndex = scopedLayers.dialog.findIndex((entry) => entry.token === token)
  if (dialogIndex >= 0) return `calc(var(--ods-z-modal) + ${dialogIndex})`

  const popoverIndex = scopedLayers.popover.findIndex((entry) => entry.token === token)
  if (popoverIndex >= 0) return `calc(var(--ods-z-dropdown) + ${popoverIndex})`

  return fallbackKind === 'dialog'
    ? 'calc(var(--ods-z-modal) + 0)'
    : 'calc(var(--ods-z-dropdown) + 0)'
}

export const useOverlayLayerParent = () => useContext(OverlayLayerContext)

export const useOverlayLayer = ({ kind, open }: UseOverlayLayerOptions) => {
  const parentToken = useOverlayLayerParent()
  const [token] = useState(createOverlayLayerToken)

  useLayoutEffect(() => {
    if (!open) return
    registerOverlayLayer({ kind, parentToken, token })
    return () => unregisterOverlayLayer(token)
  }, [kind, open, parentToken, token])

  const zIndex = useSyncExternalStore(
    subscribe,
    () => getOverlayLayerZIndex(token, kind),
    () => getOverlayLayerZIndex(token, kind),
  ) as CSSProperties['zIndex']

  return { token, zIndex }
}
