import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from '@/App'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/router/ProtectedRoute'
import AnalyticsView from '@/views/AnalyticsView'
import CalendarView from '@/views/CalendarView'
import DashboardView from '@/views/DashboardView'
import DesignSystemView from '@/views/DesignSystemView'
import LoginView from '@/views/LoginView'
import PaymentCreateView from '@/views/PaymentCreateView'
import ProjectCreateView from '@/views/ProjectCreateView'
import ProjectDetailView from '@/views/ProjectDetailView'
import ProjectsView from '@/views/ProjectsView'
import SettingsView from '@/views/SettingsView'

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
            children: [
              { path: 'dashboard', element: <DashboardView /> },
              { path: 'projects', element: <ProjectsView /> },
              { path: 'projects/create', element: <ProjectCreateView /> },
              { path: 'projects/edit/:id', element: <ProjectCreateView /> },
              { path: 'projects/:id', element: <ProjectDetailView /> },
              { path: 'projects/:id/payment/create', element: <PaymentCreateView /> },
              { path: 'payment/create', element: <PaymentCreateView /> },
              { path: 'calendar', element: <CalendarView /> },
              { path: 'analytics', element: <AnalyticsView /> },
              { path: 'design-system', element: <DesignSystemView /> },
              { path: 'settings', element: <SettingsView /> },
            ],
          },
        ],
      },
    ],
  },
])
