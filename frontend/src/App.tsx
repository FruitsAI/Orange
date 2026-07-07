import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import ToastContainer from '@/components/common/ToastContainer'
import { useThemeStore } from '@/stores/theme'

export default function App() {
  const initializeTheme = useThemeStore((state) => state.initializeTheme)

  useEffect(() => initializeTheme(), [initializeTheme])

  useEffect(() => {
    const updateLightPosition = (event: MouseEvent) => {
      const x = event.clientX / window.innerWidth
      const y = event.clientY / window.innerHeight

      document.body.style.setProperty('--light-x', x.toString())
      document.body.style.setProperty('--light-y', y.toString())
      document.body.style.setProperty('--specular-x', `${(0.5 - x) * 20}deg`)
      document.body.style.setProperty('--specular-y', `${(0.5 - y) * 20}deg`)
    }

    window.addEventListener('mousemove', updateLightPosition)
    return () => window.removeEventListener('mousemove', updateLightPosition)
  }, [])

  return (
    <>
      <Outlet />
      <ToastContainer />
    </>
  )
}
