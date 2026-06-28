import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, banUser, unbanUser, deleteUser } from '../../api/admin'

export default function Users() {
  const { user } = useUser()
  const clerkId = user?.id
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const limit = 15

  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminUsers', page, search, filter, clerkId],
    queryFn: () => fetchUsers({ page, limit, search, filter, clerkId }),
    enabled: !!clerkId
  })

  const banMutation = useMutation({
    mutationFn: (userId) => banUser(userId, clerkId),
    onSuccess: () => queryClient.invalidateQueries(['adminUsers'])
  })
  const unbanMutation = useMutation({
    mutationFn: (userId) => unbanUser(userId, clerkId),
    onSuccess: () => queryClient.invalidateQueries(['adminUsers'])
  })
  const deleteMutation = useMutation({
    mutationFn: (userId) => deleteUser(userId, clerkId),
    onSuccess: () => queryClient.invalidateQueries(['adminUsers'])
  })

  if (isLoading) return <div>Loading users...</div>
  if (isError) return <div style={{ color: 'var(--rose)' }}>Failed to load users</div>

  const { users, total, totalPages } = data

  return (
    <div>
      <h2 style={{ marginBottom: 16, color: '#e2e8f0' }}>👥 User Management</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Search by username, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Username</th><th>Display Name</th><th>Email</th><th>Joined</th><th>Last Seen</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.username}</td>
              <td>{u.displayName}</td>
              <td>{u.email}</td>
              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td>{u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : 'never'}</td>
              <td>
                {u.status === 'banned' ? (
                  <span style={{ color: 'var(--rose)' }}>Banned</span>
                ) : u.isOnline ? (
                  <span style={{ color: 'var(--green)' }}>Online</span>
                ) : (
                  'Offline'
                )}
              </td>
              <td>
                {u.status === 'banned' ? (
                  <button className="action-btn" onClick={() => unbanMutation.mutate(u._id)}>Unban</button>
                ) : (
                  <button className="action-btn" onClick={() => banMutation.mutate(u._id)}>Ban</button>
                )}
                <button
                  className="action-btn danger"
                  onClick={() => { if (window.confirm('Delete this user permanently?')) deleteMutation.mutate(u._id) }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Page {page} of {totalPages}</span>
        <div>
          <button disabled={page === 1} onClick={() => setPage(p => p-1)} style={{ padding: '4px 12px', marginRight: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', borderRadius: 4 }}>Previous</button>
          <button disabled={page === totalPages} onClick={() => setPage(p => p+1)} style={{ padding: '4px 12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', borderRadius: 4 }}>Next</button>
        </div>
      </div>
    </div>
  )
}