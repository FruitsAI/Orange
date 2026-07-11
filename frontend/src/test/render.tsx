import type { ReactElement, ReactNode } from 'react'
import { render as testingLibraryRender } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

interface RenderOptions {
  initialEntries?: string[]
}

export function render(ui: ReactElement, { initialEntries = ['/'] }: RenderOptions = {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  }

  return testingLibraryRender(ui, { wrapper: Wrapper })
}

export * from '@testing-library/react'
