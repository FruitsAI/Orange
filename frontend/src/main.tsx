import './styles/tokens.css'
import './styles/foundations.css'
import './styles/motion.css'
import './assets/liquid-glass.css'
import './assets/main.css'
import './styles/components.css'
import './styles/layout.css'
import './styles/dashboard.css'
import './styles/stat-card.css'
import './styles/design-showcase.css'
// ODS owns its cascade layers; legacy Tailwind remains loaded exactly once by assets/main.css.
import './design-system/styles.css'
import 'remixicon/fonts/remixicon.css'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { setAuthLogout } from '@/api'
import { router } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'
import { applyThemeBeforeRender } from '@/stores/theme'

applyThemeBeforeRender()

setAuthLogout(async () => {
  await useAuthStore.getState().logout()
  await router.navigate('/login')
})

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
