import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { ConfirmProvider } from '@/components/common/ConfirmProvider'
import { Toaster } from '@/design-system'
import { useThemeStore } from '@/stores/theme'

export default function App() {
  const initializeTheme = useThemeStore((state) => state.initializeTheme)

  useEffect(() => initializeTheme(), [initializeTheme])

  return (
    <ConfirmProvider>
      <Outlet />
      <Toaster />
    </ConfirmProvider>
  )
}
