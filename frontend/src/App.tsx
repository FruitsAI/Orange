import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import ToastContainer from '@/components/common/ToastContainer'
import { useThemeStore } from '@/stores/theme'

export default function App() {
  const initializeTheme = useThemeStore((state) => state.initializeTheme)

  useEffect(() => initializeTheme(), [initializeTheme])

  return (
    <>
      <Outlet />
      <ToastContainer />
    </>
  )
}
