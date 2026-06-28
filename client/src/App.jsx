import { Routes, Route, Navigate } from 'react-router-dom'
import Chat from './components/Chat'
import AdminRoute from './AdminRoute'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Rooms from './pages/admin/Rooms'
import SystemHealth from './pages/admin/SystemHealth'
import AuditLog from './pages/admin/AuditLog'
import Analytics from './pages/admin/Analytics'
import Profile from './pages/admin/Profile'  

function App() {
  return (
    <Routes>
      <Route path="/" element={<Chat />} />
      <Route path="/join/:code" element={<Chat />} />
      <Route path="/admin" element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="health" element={<SystemHealth />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<Profile />} />  
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App