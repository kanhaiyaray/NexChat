import { useUser } from '@clerk/clerk-react'
import { Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000'

export default function AdminRoute() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return
    const email = user.primaryEmailAddress?.emailAddress
    if (!email) {
      setIsAdmin(false)
      return
    }
    fetch(`${API_BASE}/api/admin/check-role?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => setIsAdmin(data.isAdmin))
      .catch(() => setIsAdmin(false))
  }, [isLoaded, isSignedIn, user])

  if (!isLoaded) return <div className="clerk-wrapper">Loading...</div>
  if (!isSignedIn) return <Navigate to="/" replace />
  if (isAdmin === null) return <div className="clerk-wrapper">Checking permissions...</div>
  if (!isAdmin) {
    return (
      <div className="clerk-wrapper" style={{ color: 'var(--rose)' }}>
        <h2>Access Denied</h2>
        <p>You do not have administrator privileges.</p>
      </div>
    )
  }
  return <Outlet />
}