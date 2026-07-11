import { useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import AppTopbar from '@/components/layout/AppTopbar'
import { useAmbientLight } from '@/hooks/useAmbientLight'

export default function AppLayout() {
  const appBackgroundRef = useAmbientLight<HTMLDivElement>()
  const mainContentRef = useRef<HTMLElement | null>(null)
  const [scrolled, setScrolled] = useState(false)

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
      <AppTopbar scrolled={scrolled} />
      <main
        className="main-content app-main"
        id="mainContent"
        onScroll={(event) => {
          const nextScrolled = event.currentTarget.scrollTop > 24
          setScrolled((current) => (current === nextScrolled ? current : nextScrolled))
        }}
        ref={mainContentRef}
      >
        <div className="view-content app-view-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
