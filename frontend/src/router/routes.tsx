import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from '@/App'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/router/ProtectedRoute'
import DashboardView from '@/views/DashboardView'
import LoginView from '@/views/LoginView'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'login', element: <LoginView /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [{ path: 'dashboard', element: <DashboardView /> }],
          },
        ],
      },
    ],
  },
])
