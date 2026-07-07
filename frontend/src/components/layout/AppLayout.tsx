import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import AppHeader from '@/components/layout/AppHeader'
import AppSidebar from '@/components/layout/AppSidebar'
import { useLayoutStore } from '@/stores/layout'

export default function AppLayout() {
  const appBackgroundRef = useRef<HTMLDivElement | null>(null)
  const mainContentRef = useRef<HTMLElement | null>(null)
  const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (appBackgroundRef.current) {
        appBackgroundRef.current.style.setProperty(
          '--light-x',
          `${(event.clientX / window.innerWidth) * 100}%`,
        )
        appBackgroundRef.current.style.setProperty(
          '--light-y',
          `${(event.clientY / window.innerHeight) * 100}%`,
        )
      }

      document.querySelectorAll('.glass-card, .liquid-glass').forEach((card) => {
        const element = card as HTMLElement
        const rect = element.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 100
        const y = ((event.clientY - rect.top) / rect.height) * 100

        if (x >= -20 && x <= 120 && y >= -20 && y <= 120) {
          element.style.setProperty('--specular-x', `${x}%`)
          element.style.setProperty('--specular-y', `${y}%`)
        }
      })
    }

    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement
      document.querySelector('.sidebar')?.classList.toggle('scrolled', target.scrollTop > 50)
    }

    document.addEventListener('mousemove', handleMouseMove)
    const mainContent = mainContentRef.current
    mainContent?.addEventListener('scroll', handleScroll)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      mainContent?.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="app-container">
      <svg className="svg-filters" style={{ height: 0, overflow: 'hidden', position: 'absolute', width: 0 }}>
        <defs>
          <filter height="140%" id="glass-refraction" width="140%" x="-20%" y="-20%">
            <feTurbulence baseFrequency="0.015" numOctaves="3" result="noise" seed="1" type="fractalNoise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="glass-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="20" />
          </filter>
          <filter height="200%" id="glass-glow" width="200%" x="-50%" y="-50%">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="8" />
            <feColorMatrix
              in="blur"
              result="glow"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            />
            <feBlend in="SourceGraphic" in2="glow" mode="screen" />
          </filter>
        </defs>
      </svg>

      <div className="app-background" ref={appBackgroundRef} />
      <AppSidebar />
      <main
        className={`main-content ${sidebarCollapsed ? 'ml-[76px]' : ''}`}
        id="mainContent"
        ref={mainContentRef}
      >
        <AppHeader />
        <div className="view-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
