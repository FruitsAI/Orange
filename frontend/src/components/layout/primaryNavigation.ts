export interface PrimaryNavigationItem {
  icon: string
  label: string
  path: string
}

export const primaryNavigationItems: readonly PrimaryNavigationItem[] = [
  { icon: 'ri-dashboard-line', label: '工作台', path: '/dashboard' },
  { icon: 'ri-folder-3-line', label: '项目管理', path: '/projects' },
  { icon: 'ri-calendar-check-line', label: '收款日历', path: '/calendar' },
  { icon: 'ri-line-chart-line', label: '数据分析', path: '/analytics' },
  { icon: 'ri-palette-line', label: '设计系统', path: '/design-system' },
]
