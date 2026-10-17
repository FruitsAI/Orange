import NotificationManagement from '@/components/settings/NotificationManagement'
import { useAuthStore } from '@/stores/auth'

export default function NotificationsView() {
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin')

  return (
    <div className="notifications-view" data-motion-scope="notifications">
      <NotificationManagement isAdmin={isAdmin} />
    </div>
  )
}
