import type { ReactNode } from 'react'
import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar'
import { useAuth } from '../contexts/AuthContext'
import logo from '../assets/omni_logo.png'

type SidebarItem = {
  label: string
  icon: ReactNode
}

type AppSidebarProps = {
  items: SidebarItem[]
  activeLabel: string
  onSelect: (label: string) => void
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'
}

export function AppSidebar({ items, activeLabel, onSelect }: AppSidebarProps) {
  const { user } = useAuth()
  const displayName = user?.name ?? 'Usuário'
  const displayEmail = user?.email ?? ''
  const initials = initialsFromName(displayName)

  return (
    <Sidebar
      rootStyles={sidebarStyles.sidebar}
      backgroundColor="#ffffff"
      width="260px"
    >
      <div style={sidebarStyles.sidebarInner}>
        <div style={sidebarStyles.logoBlock}>
          <img src={logo} alt="OmniSync logo" style={sidebarStyles.logoImg} />
          <div>
            <div style={sidebarStyles.title}>OmniSync</div>
          </div>
        </div>

        <Menu
          menuItemStyles={sidebarStyles.menuItemStyles}
          rootStyles={sidebarStyles.menu}
        >
          {items.map((item) => (
            <MenuItem
              key={item.label}
              icon={item.icon}
              active={item.label === activeLabel}
              onClick={() => onSelect(item.label)}
              style={item.label === activeLabel ? sidebarStyles.activeItem : undefined}
            >
              {item.label}
            </MenuItem>
          ))}
        </Menu>

        <div style={sidebarStyles.userBlock}>
          <div style={sidebarStyles.avatar}>
            <span style={sidebarStyles.avatarInitials}>{initials}</span>
          </div>
          <div style={sidebarStyles.userText}>
            <div style={sidebarStyles.userName}>{displayName}</div>
            <div style={sidebarStyles.userRole}>{displayEmail || '—'}</div>
          </div>
        </div>
      </div>
    </Sidebar>
  )
}

const sidebarStyles = {
  sidebar: {
    height: '100vh',
    position: 'sticky',
    top: 0,
    borderRight: '1px solid #eee',
    flexShrink: 0,
  },
  sidebarInner: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  logoBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px',
    borderBottom: '1px solid #eee',
  },
  logoImg: {
    width: '40px',
    height: '40px',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  title: {
    fontWeight: 700,
    fontSize: '18px',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '2px',
  },
  menu: {
    flex: 1,
    paddingTop: '8px',
  },
  menuItemStyles: {
    button: {
      borderRadius: '8px',
      margin: '2px 12px',
      paddingLeft: '12px',
      '&:hover': {
        backgroundColor: '#f3f4f6',
      },
      '&.ps-active': {
        backgroundColor: '#ede9fe',
        color: '#6d28d9',
      },
    },
    icon: {
      color: 'inherit',
      '&.ps-active': {
        color: '#6d28d9',
      },
    },
  },
  activeItem: {
    backgroundColor: '#ede9fe',
    color: '#6d28d9',
  },
  userBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    margin: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    marginTop: 'auto',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#ddd6fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#5b21b6',
  },
  userText: {
    minWidth: 0,
  },
  userName: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#1f2937',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
} as const
