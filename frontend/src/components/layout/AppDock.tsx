import { RouterNavLink, Surface } from '@/design-system'
import { primaryNavigationItems } from './primaryNavigation'

export default function AppDock() {
  return (
    <Surface
      as="nav"
      aria-label="快捷导航"
      className="app-dock"
      padding="none"
      radius="shell"
      variant="glass"
    >
      {primaryNavigationItems.map((item) => (
        <RouterNavLink
          appearance="dock"
          className="app-dock__link"
          icon={<i className={item.icon} />}
          key={item.path}
          to={item.path}
        >
          {item.label}
        </RouterNavLink>
      ))}
    </Surface>
  )
}
