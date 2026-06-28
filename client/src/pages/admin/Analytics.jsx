import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  CartesianGrid, Legend
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

export default function Analytics() {
  const { user } = useUser();
  const clerkId = user?.id;
  const [days, setDays] = useState(14);
  const { stats: liveStats } = useAdminSocket(clerkId);

  // KPI stats
  const { data: statsData } = useQuery({
    queryKey: ['adminStats', clerkId],
    queryFn: () => fetchAdminStats(clerkId),
    enabled: !!clerkId
  });
  const stats = liveStats || statsData;

  // Message volume (existing)
  const { data: msgVol } = useQuery({
    queryKey: ['adminMsgAnalytics', days, clerkId],
    queryFn: () => fetchMessageAnalytics(days, clerkId),
    enabled: !!clerkId
  });

  // User growth
  const { data: userGrowth } = useQuery({
    queryKey: ['userGrowth', days, clerkId],
    queryFn: () => fetchUsersOverTime(days, clerkId),
    enabled: !!clerkId
  });

  // Room growth
  const { data: roomGrowth } = useQuery({
    queryKey: ['roomGrowth', days, clerkId],
    queryFn: () => fetchRoomsOverTime(days, clerkId),
    enabled: !!clerkId
  });

  // Message types
  const { data: msgTypes } = useQuery({
    queryKey: ['msgTypes', clerkId],
    queryFn: () => fetchMessageTypes(clerkId),
    enabled: !!clerkId
  });

  // Top users
  const { data: topUsers } = useQuery({
    queryKey: ['topUsers', clerkId],
    queryFn: () => fetchTopUsers(10, clerkId),
    enabled: !!clerkId
  });

  // Heatmap
  const { data: heatmap } = useQuery({
    queryKey: ['heatmap', days, clerkId],
    queryFn: () => fetchActivityHeatmap(days, clerkId),
    enabled: !!clerkId
  });

  // User analytics (pie)
  const { data: userAnalytics } = useQuery({
    queryKey: ['userAnalytics', clerkId],
    queryFn: () => fetchUserAnalytics(clerkId),
    enabled: !!clerkId
  });

  if (!stats) return <div style={{ color: '#94a3b8' }}>Loading analytics...</div>;

  // Prepare data
  const msgChartData = msgVol?.data?.map(d => ({ date: d._id, messages: d.count })) || [];
  const userGrowthData = userGrowth?.data?.map(d => ({ date: d._id, users: d.count })) || [];
  const roomGrowthData = roomGrowth?.data?.map(d => ({ date: d._id, rooms: d.count })) || [];

  const pieUserData = userAnalytics ? [
    { name: 'Active', value: userAnalytics.active },
    { name: 'Banned', value: userAnalytics.banned },
    { name: 'Offline', value: userAnalytics.total - userAnalytics.online }
  ] : [];

  const pieMsgTypes = msgTypes?.data || [];

  // Heatmap: group by day and hour
  const heatmapData = heatmap?.data || [];
  const daysRange = [...new Set(heatmapData.map(d => d.day))].sort();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const heatmapMatrix = daysRange.map(day => {
    const row = hours.map(hour => {
      const found = heatmapData.find(d => d.day === day && d.hour === hour);
      return found ? found.count : 0;
    });
    return { day, ...Object.fromEntries(hours.map(h => [h, row[h]])) };
  });

  return (
    <div style={{ color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Syne', fontWeight: 700 }}>📊 Advanced Analytics</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ color: '#94a3b8', fontSize: 13 }}>Days:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,229,255,0.2)', background: '#0f172a', color: '#e2e8f0' }}
          >
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Total Users</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Syne' }}>{stats.totalUsers}</div>
        </div>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Total Rooms</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Syne' }}>{stats.totalRooms}</div>
        </div>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Total Messages</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Syne' }}>{stats.messagesToday}</div>
        </div>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Active Users (24h)</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Syne' }}>{stats.newUsers24h}</div>
        </div>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Online Now</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Syne' }}>{stats.onlineUsers}</div>
        </div>
      </div>

      {/* Row 1: User & Room Growth */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <h4 style={{ marginBottom: 8, color: '#94a3b8' }}>User Growth</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
              <Area type="monotone" dataKey="users" stroke="#00e5ff" fill="#00e5ff" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <h4 style={{ marginBottom: 8, color: '#94a3b8' }}>Room Creation</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={roomGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
              <Area type="monotone" dataKey="rooms" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Message Volume & Type Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <h4 style={{ marginBottom: 8, color: '#94a3b8' }}>Message Volume</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={msgChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
              <Bar dataKey="messages" fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
          <h4 style={{ marginBottom: 8, color: '#94a3b8' }}>Message Types</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieMsgTypes} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label>
                {pieMsgTypes.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Activity Heatmap */}
      <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)', marginBottom: 24 }}>
        <h4 style={{ marginBottom: 8, color: '#94a3b8' }}>Activity Heatmap (last {days} days)</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ padding: 4, color: '#94a3b8' }}>Day</th>
                {hours.map(h => <th key={h} style={{ padding: 4, color: '#94a3b8', textAlign: 'center' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {heatmapMatrix.map(row => (
                <tr key={row.day}>
                  <td style={{ padding: 4, color: '#94a3b8', whiteSpace: 'nowrap' }}>{row.day}</td>
                  {hours.map(h => {
                    const val = row[h] || 0;
                    const intensity = Math.min(val / 10, 1);
                    const bg = `rgba(0, 229, 255, ${intensity * 0.7})`;
                    return (
                      <td key={h} style={{ padding: 4, textAlign: 'center', backgroundColor: bg, color: val > 5 ? '#000' : '#e2e8f0' }}>
                        {val > 0 ? val : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Top Active Users */}
      <div style={{ background: 'linear-gradient(145deg, #141b2b, #0f172a)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,229,255,0.08)' }}>
        <h4 style={{ marginBottom: 8, color: '#94a3b8' }}>🏆 Top Active Users</h4>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Username</th>
              <th>Messages</th>
              <th>Last Seen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {topUsers?.topUsers?.map((u, idx) => (
              <tr key={u.username}>
                <td>{idx + 1}</td>
                <td>{u.username}</td>
                <td>{u.messageCount}</td>
                <td>{u.lastSeen ? new Date(u.lastSeen).toLocaleDateString() : 'Never'}</td>
                <td>{u.status === 'banned' ? <span style={{ color: '#f87171' }}>Banned</span> : <span style={{ color: '#34d399' }}>Active</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}