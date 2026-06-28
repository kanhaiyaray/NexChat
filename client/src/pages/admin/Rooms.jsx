import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRooms, deleteRoom, suspendRoom, unsuspendRoom } from '../../api/admin'

export default function Rooms() {
  const { user } = useUser()
  const clerkId = user?.id
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const limit = 15
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminRooms', page, search, clerkId],
    queryFn: () => fetchRooms({ page, limit, search, clerkId }),
    enabled: !!clerkId
  })

  const deleteMutation = useMutation({
    mutationFn: (roomId) => deleteRoom(roomId, clerkId),
    onSuccess: () => queryClient.invalidateQueries(['adminRooms'])
  })
  const suspendMutation = useMutation({
    mutationFn: (roomId) => suspendRoom(roomId, clerkId),
    onSuccess: () => queryClient.invalidateQueries(['adminRooms'])
  })
  const unsuspendMutation = useMutation({
    mutationFn: (roomId) => unsuspendRoom(roomId, clerkId),
    onSuccess: () => queryClient.invalidateQueries(['adminRooms'])
  })

  if (isLoading) return <div>Loading rooms...</div>
  if (isError) return <div style={{ color: 'var(--rose)' }}>Failed to load rooms</div>

  const { rooms, total, totalPages } = data

  return (
    <div>
      <h2 style={{ marginBottom: 16, color: '#e2e8f0' }}>🏠 Room Management</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Search by room ID or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
        />
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Room ID</th><th>Code</th><th>Created By</th><th>Created</th><th>Members</th><th>Last Activity</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map(r => (
            <tr key={r._id}>
              <td>{r.roomId.slice(0, 12)}</td>
              <td>{r.code}</td>
              <td>{r.createdBy}</td>
              <td>{new Date(r.createdAt).toLocaleDateString()}</td>
              <td>{r.memberCount}</td>
              <td>{r.lastActivity ? new Date(r.lastActivity).toLocaleDateString() : 'never'}</td>
              <td>{r.suspended ? <span style={{ color: 'var(--rose)' }}>Suspended</span> : 'Active'}</td>
              <td>
                {r.suspended ? (
                  <button className="action-btn" onClick={() => unsuspendMutation.mutate(r._id)}>Unsuspend</button>
                ) : (
                  <button className="action-btn" onClick={() => suspendMutation.mutate(r._id)}>Suspend</button>
                )}
                <button
                  className="action-btn danger"
                  onClick={() => { if (window.confirm('Delete this room and all messages?')) deleteMutation.mutate(r._id) }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span>Page {page} of {totalPages}</span>
        <div>
          <button disabled={page===1} onClick={() => setPage(p=>p-1)} style={{ padding: '4px 12px', marginRight: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', borderRadius: 4 }}>Previous</button>
          <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} style={{ padding: '4px 12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', borderRadius: 4 }}>Next</button>
        </div>
      </div>
    </div>
  )
}