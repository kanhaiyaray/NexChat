import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '../../api/admin'

export default function AuditLog() {
  const { user } = useUser()
  const clerkId = user?.id
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const limit = 20

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminAudit', page, search, clerkId],
    queryFn: () => fetchAuditLogs({ page, limit, search, clerkId }),
    enabled: !!clerkId
  })

  if (isLoading) return <div>Loading audit logs...</div>
  if (isError) return <div style={{ color: 'var(--rose)' }}>Failed to load logs</div>

  const { logs, total, totalPages } = data

  return (
    <div>
      <h2 style={{ color: '#e2e8f0' }}>📋 Audit Log</h2>
      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Search by admin, action, target..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
        />
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Admin</th><th>Action</th><th>Target</th><th>Details</th><th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log._id}>
              <td>{log.adminName}</td>
              <td>{log.action}</td>
              <td>{log.target}</td>
              <td>{JSON.stringify(log.details)}</td>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
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