import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
  CartesianGrid
} from 'recharts';
import {
  fetchAdminStats,
  fetchMessageAnalytics,
  fetchUserAnalytics,
  fetchUsersOverTime,
  fetchRoomsOverTime,
  fetchMessageTypes,
  fetchTopUsers,
  fetchActivityHeatmap
} from '../../api/admin';
import { useAdminSocket } from '../../hooks/useAdminSocket';

const COLORS = ['#00e5ff', '#a78bfa', '#f472b6', '#34d399'];

// Helper Components
const StatsCard = ({ label, value, color }) => (
  <div style={{
    background: 'linear-gradient(145deg, #141b2b, #0f172a)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(0,229,255,0.08)',
  }}>
    <div style={{ color: '#94a3b8', fontSize: '12px' }}>{label}</div>
    <div style={{ 
      fontSize: '28px', 
      fontWeight: 700, 
      fontFamily: 'Syne, sans-serif',
      color: '#e2e8f0'
    }}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </div>
  </div>
);

const ChartCard = ({ title, loading, empty, children }) => {
  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(145deg, #141b2b, #0f172a)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid rgba(0,229,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '240px',
        color: '#64748b'
      }}>
        <span className="spin-icon">⏳</span> Loading...
      </div>
    );
  }

  if (empty) {
    return (
      <div style={{
        background: 'linear-gradient(145deg, #141b2b, #0f172a)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid rgba(0,229,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '240px',
        color: '#64748b'
      }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(145deg, #141b2b, #0f172a)',
      padding: '16px',
      borderRadius: '12px',
      border: '1px solid rgba(0,229,255,0.08)',
    }}>
      <h4 style={{ marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>{title}</h4>
      {children}
    </div>
  );
};

export default function Analytics() {
  const { user } = useUser();
  const clerkId = user?.id;
  const [days, setDays] = useState(7);
  const [activeTab, setActiveTab] = useState('overview');
  const { stats: liveStats } = useAdminSocket(clerkId);

  const queryOptions = {
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !!clerkId,
  };

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats', clerkId],
    queryFn: () => fetchAdminStats(clerkId),
    ...queryOptions
  });

  const { data: msgVol, isLoading: msgLoading } = useQuery({
    queryKey: ['adminMsgAnalytics', days, clerkId],
    queryFn: () => fetchMessageAnalytics(days, clerkId),
    ...queryOptions,
    enabled: !!clerkId && (activeTab === 'overview' || activeTab === 'messages'),
  });

  const { data: userGrowth, isLoading: userGrowthLoading } = useQuery({
    queryKey: ['userGrowth', days, clerkId],
    queryFn: () => fetchUsersOverTime(days, clerkId),
    ...queryOptions,
    enabled: !!clerkId && activeTab === 'users',
  });

  const { data: roomGrowth, isLoading: roomGrowthLoading } = useQuery({
    queryKey: ['roomGrowth', days, clerkId],
    queryFn: () => fetchRoomsOverTime(days, clerkId),
    ...queryOptions,
    enabled: !!clerkId && activeTab === 'rooms',
  });

  const { data: msgTypes, isLoading: msgTypesLoading } = useQuery({
    queryKey: ['msgTypes', clerkId],
    queryFn: () => fetchMessageTypes(clerkId),
    ...queryOptions,
    enabled: !!clerkId && (activeTab === 'overview' || activeTab === 'messages'),
  });

  const { data: topUsers, isLoading: topUsersLoading } = useQuery({
    queryKey: ['topUsers', clerkId],
    queryFn: () => fetchTopUsers(10, clerkId),
    ...queryOptions,
    enabled: !!clerkId && activeTab === 'users',
  });

  const stats = liveStats || statsData;

  if (statsLoading) {
    return (
      <div style={{ color: '#94a3b8', padding: '40px', textAlign: 'center' }}>
        <div className="spin-icon" style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
        Loading analytics...
      </div>
    );
  }

  if (!stats) return null;

  // Prepare data for charts
  const msgChartData = msgVol?.data?.map(d => ({ date: d._id, messages: d.count })) || [];
  const userGrowthData = userGrowth?.data?.map(d => ({ date: d._id, users: d.count })) || [];
  const roomGrowthData = roomGrowth?.data?.map(d => ({ date: d._id, rooms: d.count })) || [];
  const pieMsgTypes = msgTypes?.data || [];

  return (
    <div style={{ color: '#e2e8f0' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>📊 Analytics</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ color: '#94a3b8', fontSize: '13px' }}>Days:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '8px', 
              border: '1px solid rgba(0,229,255,0.2)', 
              background: '#0f172a', 
              color: '#e2e8f0',
              fontSize: '13px'
            }}
          >
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        marginBottom: '24px',
        borderBottom: '1px solid rgba(0,229,255,0.08)',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        {['overview', 'users', 'rooms', 'messages'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab ? 'rgba(0,229,255,0.12)' : 'transparent',
              color: activeTab === tab ? '#00e5ff' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <StatsCard label="Total Users" value={stats.totalUsers} color="#00e5ff" />
        <StatsCard label="Online Now" value={stats.onlineUsers} color="#34d399" />
        <StatsCard label="Total Rooms" value={stats.totalRooms} color="#a78bfa" />
        <StatsCard label="Messages Today" value={stats.messagesToday} color="#fbbf24" />
        <StatsCard label="New Users (24h)" value={stats.newUsers24h} color="#f472b6" />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <ChartCard 
            title="Message Volume" 
            loading={msgLoading}
            empty={!msgChartData.length}
          >
            {msgChartData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={msgChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                  <Bar dataKey="messages" fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard 
            title="Message Types" 
            loading={msgTypesLoading}
            empty={!pieMsgTypes.length}
          >
            {pieMsgTypes.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie 
                    data={pieMsgTypes} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={40} 
                    outerRadius={70} 
                    dataKey="value" 
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                  >
                    {pieMsgTypes.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <ChartCard 
            title="User Growth" 
            loading={userGrowthLoading}
            empty={!userGrowthData.length}
          >
            {userGrowthData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                  <Area type="monotone" dataKey="users" stroke="#00e5ff" fill="#00e5ff" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard 
            title="Top Users" 
            loading={topUsersLoading}
            empty={!topUsers?.topUsers?.length}
          >
            {topUsers?.topUsers && (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {topUsers.topUsers.slice(0, 5).map((u, idx) => (
                  <div key={u.username} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    <span style={{ color: '#94a3b8' }}>#{idx + 1}</span>
                    <span>{u.username}</span>
                    <span style={{ color: '#34d399' }}>{u.messageCount} msgs</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {activeTab === 'rooms' && (
        <ChartCard 
          title="Room Growth" 
          loading={roomGrowthLoading}
          empty={!roomGrowthData.length}
        >
          {roomGrowthData.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={roomGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                <Area type="monotone" dataKey="rooms" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}

      {activeTab === 'messages' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <ChartCard 
            title="Message Volume" 
            loading={msgLoading}
            empty={!msgChartData.length}
          >
            {msgChartData.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={msgChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                  <Bar dataKey="messages" fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard 
            title="Message Types" 
            loading={msgTypesLoading}
            empty={!pieMsgTypes.length}
          >
            {pieMsgTypes.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie 
                    data={pieMsgTypes} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={50} 
                    outerRadius={80} 
                    dataKey="value" 
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                  >
                    {pieMsgTypes.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
