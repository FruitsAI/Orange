import type { ReactElement, ReactNode } from 'react'
import { render as testingLibraryRender } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConfirmProvider } from '@/components/common/ConfirmProvider'

interface RenderOptions {
  initialEntries?: string[]
  reactStrictMode?: boolean
}

export function render(
  ui: ReactElement,
  { initialEntries = ['/'], reactStrictMode = false }: RenderOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </MemoryRouter>
    )
  }

  return testingLibraryRender(ui, { reactStrictMode, wrapper: Wrapper })
}

export { fireEvent, screen, waitFor, within } from '@testing-library/react'
