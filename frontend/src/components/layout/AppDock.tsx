import { NavLink } from 'react-router-dom'
import { primaryNavigationItems } from './primaryNavigation'

export default function AppDock() {
  return (
    <nav aria-label="快捷导航" className="app-dock">
      {primaryNavigationItems.map((item) => (
        <NavLink className="app-dock__link" key={item.path} to={item.path}>
          <i aria-hidden="true" className={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
