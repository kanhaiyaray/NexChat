import { useUser } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../../api/admin'

export default function SystemHealth() {
  const { user } = useUser()
  const clerkId = user?.id
  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminHealth', clerkId],
    queryFn: () => fetchHealth(clerkId),
    enabled: !!clerkId,
    refetchInterval: 10000
  })

  if (isLoading) return <div>Loading health...</div>
  if (isError) return <div style={{ color: 'var(--rose)' }}>Failed to load health</div>

  return (
    <div>
      <h2 style={{ color: '#e2e8f0' }}>🩺 System Health</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 16, marginTop: 16 }}>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <div style={{ color: '#94a3b8' }}>Uptime</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0' }}>{Math.floor(data.serverUptime / 60)} minutes</div>
        </div>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <div style={{ color: '#94a3b8' }}>MongoDB</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: data.mongo === 'connected' ? '#34d399' : '#f87171' }}>{data.mongo}</div>
        </div>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <div style={{ color: '#94a3b8' }}>Cloudinary</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: data.cloudinary === 'configured' ? '#34d399' : '#f87171' }}>{data.cloudinary}</div>
        </div>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <div style={{ color: '#94a3b8' }}>Socket Connections</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0' }}>{data.socketConnections}</div>
        </div>
      </div>
    </div>
  )
}