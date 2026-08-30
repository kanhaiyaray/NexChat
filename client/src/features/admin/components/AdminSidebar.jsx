import { NavLink, useLocation } from 'react-router-dom';
import { SignOutButton, useUser } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';

const AdminSidebar = ({ isOpen, onClose, onToggle }) => {
  const { user } = useUser();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { path: '/admin', label: '📊 Dashboard', icon: '📊' },
    { path: '/admin/users', label: '👥 Users', icon: '👥' },
    { path: '/admin/rooms', label: '🏠 Rooms', icon: '🏠' },
    { path: '/admin/health', label: '🩺 Health', icon: '🩺' },
    { path: '/admin/audit', label: '📋 Audit', icon: '📋' },
    { path: '/admin/analytics', label: '📈 Analytics', icon: '📈' },
    { path: '/admin/profile', label: '⚙️ Profile', icon: '⚙️' },
  ];

  const sidebarStyles = {
    width: '260px',
    background: 'rgba(10,14,26,0.98)',
    borderRight: '1px solid rgba(0,229,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 16px',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 50,
    backdropFilter: 'blur(12px)',
    transition: 'transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1)',
    transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
    boxShadow: isMobile && isOpen ? '2px 0 20px rgba(0,0,0,0.5)' : 'none',
  };

  const overlayStyles = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 49,
    display: isMobile && isOpen ? 'block' : 'none',
  };

  const navLinkStyles = ({ isActive }) => ({
    padding: '10px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: isActive ? '#00e5ff' : '#94a3b8',
    fontWeight: isActive ? 600 : 400,
    fontSize: '14px',
    transition: 'all 0.15s ease',
    background: isActive ? 'rgba(0,229,255,0.08)' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
  });

  const navLinkHoverStyles = {
    background: 'rgba(0,229,255,0.05)',
    color: '#e2e8f0',
  };

  return (
    <>
      {isMobile && isOpen && <div style={overlayStyles} onClick={onClose} />}
      
      <aside style={sidebarStyles}>
        <div style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '20px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #00e5ff, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '28px',
          paddingLeft: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>⚙️ NexChat Admin</span>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ×
            </button>
          )}
        </div>

        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flex: 1,
        }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={navLinkStyles}
              className={({ isActive }) => isActive ? 'nav-active' : ''}
              onClick={isMobile ? onClose : undefined}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{
          borderTop: '1px solid rgba(0,229,255,0.08)',
          paddingTop: '16px',
          marginTop: 'auto',
        }}>
          <div style={{
            color: '#94a3b8',
            fontSize: '13px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3dd6f5, #a78bfa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#070b14',
              fontWeight: 700,
              fontSize: '14px',
            }}>
              {user?.fullName?.[0] || user?.firstName?.[0] || 'A'}
            </div>
            <span>{user?.fullName || user?.username || 'Admin'}</span>
          </div>
          <SignOutButton>
            <button style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(0,229,255,0.12)',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(0,229,255,0.12)';
              e.currentTarget.style.color = '#94a3b8';
            }}
            >
              <span>🚪</span> Sign out
            </button>
          </SignOutButton>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
