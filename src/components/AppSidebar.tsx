import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar'
import {
  FiLayers,
  FiArchive,
  FiGlobe,
  FiShoppingCart,
  FiHome,
  FiUsers,
  FiSettings,
} from 'react-icons/fi'
import logo from '../assets/omni_logo.png'
import userExample from '../assets/user_example.png'

const menuItems = [
  { label: 'Dashboard', icon: <FiLayers size={20} />, active: true },
  { label: 'Stock', icon: <FiArchive size={20} /> },
  { label: 'Marketplaces', icon: <FiGlobe size={20} /> },
  { label: 'Orders', icon: <FiShoppingCart size={20} /> },
  { label: 'Stores', icon: <FiHome size={20} /> },
  { label: 'Users', icon: <FiUsers size={20} /> },
  { label: 'Settings', icon: <FiSettings size={20} /> },
]

export function AppSidebar() {
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

        <Menu menuItemStyles={sidebarStyles.menuItemStyles} rootStyles={sidebarStyles.menu}>
          {menuItems.map((item) => (
            <MenuItem
              key={item.label}
              icon={item.icon}
              active={item.active}
              style={item.active ? sidebarStyles.activeItem : undefined}
            >
              {item.label}
            </MenuItem>
          ))}
        </Menu>

        <div style={sidebarStyles.userBlock}>
          <div style={sidebarStyles.avatar}>
            <img
              src={userExample}
              alt="User example profile"
              style={sidebarStyles.avatarImg}
            />
          </div>
          <div>
            <div style={sidebarStyles.userName}>User Example</div>
            <div style={sidebarStyles.userRole}>Admin Access</div>
          </div>
        </div>
      </div>
    </Sidebar>
  )
}

const sidebarStyles = {
  sidebar: {
    height: '100vh',
    borderRight: '1px solid #eee',
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
    backgroundSize: 'cover',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 'inherit',
    display: 'block',
  },
  userName: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#1f2937',
  },
  userRole: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
} as const
