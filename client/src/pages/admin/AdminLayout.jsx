import { Outlet, NavLink } from 'react-router-dom'
import { useUser, SignOutButton } from '@clerk/clerk-react'

export default function AdminLayout() {
  const { user } = useUser()

  const navItems = [
    { path: '/admin', label: 'Dashboard' },
    { path: '/admin/users', label: 'Users' },
    { path: '/admin/rooms', label: 'Rooms' },
    { path: '/admin/health', label: 'Health' },
    { path: '/admin/audit', label: 'Audit' },
    { path: '/admin/analytics', label: 'Analytics' },
    { path: '/admin/profile', label: 'Profile' },   
  ]

  return (
    <div style={{ 
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0e1a',
    }}>
      {/* -------- Vertical Sidebar -------- */}
      <aside style={{
        width: 240,
        background: 'rgba(10,14,26,0.95)',
        borderRight: '1px solid rgba(0,229,255,0.12)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          fontFamily: 'Syne',
          fontSize: 22,
          fontWeight: 800,
          background: 'linear-gradient(135deg, #00e5ff, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 32,
          paddingLeft: 8,
        }}>
          ⚙️ NexChat Admin
        </div>

        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
        }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? 'nav-active' : ''}
              style={({ isActive }) => ({
                padding: '10px 16px',
                borderRadius: 8,
                textDecoration: 'none',
                color: isActive ? '#00e5ff' : '#94a3b8',
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                transition: 'all 0.15s',
                background: isActive ? 'rgba(0,229,255,0.08)' : 'transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{
          borderTop: '1px solid rgba(0,229,255,0.08)',
          paddingTop: 16,
          marginTop: 'auto',
        }}>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
            {user?.fullName || 'Admin'}
          </div>
          <SignOutButton>
            <button style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(0,229,255,0.15)',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 12,
              transition: '0.15s',
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(0,229,255,0.1)'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </aside>

      <main style={{
        marginLeft: 240,
        flex: 1,
        padding: 24,
        overflowY: 'auto',
        minHeight: '100vh',
      }}>
        <Outlet />
      </main>
    </div>
  )
}