import { useUser } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { fetchAdminStats } from '../../api/admin'
import { useAdminSocket } from '../../hooks/useAdminSocket'

export default function Dashboard() {
  const { user } = useUser()
  const clerkId = user?.id
  const { data: stats } = useQuery({
    queryKey: ['adminStats', clerkId],
    queryFn: () => fetchAdminStats(clerkId),
    enabled: !!clerkId
  })
  const { stats: liveStats } = useAdminSocket(clerkId)
  const currentStats = liveStats || stats

  if (!currentStats) return <div style={{ color: '#94a3b8' }}>Loading stats...</div>

  const cards = [
    { label: 'Total Users', value: currentStats.totalUsers, trend: '+12%', up: true },
    { label: 'Online Now', value: currentStats.onlineUsers, trend: '+5', up: true },
    { label: 'Total Rooms', value: currentStats.totalRooms, trend: '+3', up: true },
    { label: 'Active Rooms', value: currentStats.activeRooms, trend: '-2', up: false },
    { label: 'Messages Today', value: currentStats.messagesToday, trend: '+8%', up: true },
    { label: 'New Users (24h)', value: currentStats.newUsers24h, trend: '+4', up: true },
  ]

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', marginBottom: 24, fontFamily: 'Syne', fontWeight: 700 }}>
        📊 Dashboard Overview
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 20,
      }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: 'linear-gradient(145deg, #141b2b, #0f172a)',
            borderRadius: 16,
            padding: '20px 16px',
            border: '1px solid rgba(0,229,255,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,229,255,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'
          }}
          >
            <div style={{ color: '#94a3b8', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {c.label}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#e2e8f0', fontFamily: 'Syne', marginTop: 4 }}>
              {c.value}
            </div>
            <div style={{
              marginTop: 8,
              fontSize: 12,
              color: c.up ? '#34d399' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              {c.up ? '↑' : '↓'} {c.trend}
            </div>
          </div>
        ))}
      </div>

      {/* System health mini card */}
      <div style={{
        marginTop: 24,
        background: 'linear-gradient(145deg, #141b2b, #0f172a)',
        borderRadius: 16,
        padding: '16px 20px',
        border: '1px solid rgba(0,229,255,0.08)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
      }}>
        <div><strong style={{ color: '#94a3b8' }}>Uptime:</strong> <span style={{ color: '#e2e8f0' }}>{Math.floor(currentStats.serverUptime / 60)}m</span></div>
        <div><strong style={{ color: '#94a3b8' }}>MongoDB:</strong> <span style={{ color: currentStats.mongoStatus === 'connected' ? '#34d399' : '#f87171' }}>{currentStats.mongoStatus}</span></div>
        <div><strong style={{ color: '#94a3b8' }}>Cloudinary:</strong> <span style={{ color: currentStats.cloudinaryStatus === 'configured' ? '#34d399' : '#f87171' }}>{currentStats.cloudinaryStatus}</span></div>
      </div>
    </div>
  )
}