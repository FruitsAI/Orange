import { NavLink } from 'react-router-dom'
import { useLayoutStore } from '@/stores/layout'

const menuItems = [
  { name: '工作台', icon: 'ri-dashboard-3-line', path: '/dashboard' },
  { name: '项目管理', icon: 'ri-folder-line', path: '/projects' },
  { name: '收款日历', icon: 'ri-calendar-line', path: '/calendar' },
  { name: '数据分析', icon: 'ri-bar-chart-grouped-line', path: '/analytics' },
]

const systemItems = [{ name: '系统设置', icon: 'ri-settings-4-line', path: '/settings' }]

export default function AppSidebar() {
  const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed)

  return (
    <aside className={`sidebar liquid-glass ${sidebarCollapsed ? 'collapsed' : ''}`} id="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img alt="Orange Logo" src="/orange.png" />
          </div>
          <span className="sidebar-logo-text">Orange</span>
        </div>
      </div>

      <nav className="nav-menu">
        <div className="nav-section">
          <div className="nav-section-title">主菜单</div>
          {menuItems.map((item) => (
            <NavLink className="nav-item" key={item.path} to={item.path}>
              <span className="nav-item-icon">
                <i className={item.icon} />
              </span>
              <span className="nav-item-text">{item.name}</span>
            </NavLink>
          ))}
        </div>

        <div className="nav-section">
          <div className="nav-section-title">系统</div>
          {systemItems.map((item) => (
            <NavLink className="nav-item" key={item.path} to={item.path}>
              <span className="nav-item-icon">
                <i className={item.icon} />
              </span>
              <span className="nav-item-text">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  )
}
