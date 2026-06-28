const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000'

// ─── Stats ──────────────────────────────────────────────────────
export async function fetchAdminStats(clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/stats?clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

// ─── Users ──────────────────────────────────────────────────────
export async function fetchUsers({ page, limit, search, filter, clerkId }) {
  const params = new URLSearchParams({ page, limit, search, filter })
  const res = await fetch(`${API_BASE}/api/admin/users?${params}&clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export async function banUser(userId, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {
    method: 'PUT',
    headers: { 'x-clerk-id': clerkId, 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error('Ban failed')
  return res.json()
}

export async function unbanUser(userId, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/unban`, {
    method: 'PUT',
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Unban failed')
  return res.json()
}

export async function deleteUser(userId, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Delete failed')
  return res.json()
}

// ─── Rooms ──────────────────────────────────────────────────────
export async function fetchRooms({ page, limit, search, clerkId }) {
  const params = new URLSearchParams({ page, limit, search })
  const res = await fetch(`${API_BASE}/api/admin/rooms?${params}&clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch rooms')
  return res.json()
}

export async function deleteRoom(roomId, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/rooms/${roomId}`, {
    method: 'DELETE',
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Delete room failed')
  return res.json()
}

export async function suspendRoom(roomId, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/rooms/${roomId}/suspend`, {
    method: 'PUT',
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Suspend failed')
  return res.json()
}

export async function unsuspendRoom(roomId, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/rooms/${roomId}/unsuspend`, {
    method: 'PUT',
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Unsuspend failed')
  return res.json()
}

// ─── Audit ──────────────────────────────────────────────────────
export async function fetchAuditLogs({ page, limit, search, clerkId }) {
  const params = new URLSearchParams({ page, limit, search })
  const res = await fetch(`${API_BASE}/api/admin/audit?${params}&clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch audit logs')
  return res.json()
}

// ─── Health ─────────────────────────────────────────────────────
export async function fetchHealth(clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/health?clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Health check failed')
  return res.json()
}

// ─── Basic Analytics (existing) ──────────────────────────────
export async function fetchMessageAnalytics(days = 7, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/analytics/messages?days=${days}&clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch analytics')
  return res.json()
}

export async function fetchUserAnalytics(clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/analytics/users?clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch user analytics')
  return res.json()
}

// ─── Advanced Analytics (NEW) ──────────────────────────────────
export async function fetchUsersOverTime(days, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/analytics/users-over-time?days=${days}&clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch user growth')
  return res.json()
}

export async function fetchRoomsOverTime(days, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/analytics/rooms-over-time?days=${days}&clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch room growth')
  return res.json()
}

export async function fetchMessageTypes(clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/analytics/message-types?clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch message types')
  return res.json()
}

export async function fetchTopUsers(limit = 10, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/analytics/top-users?limit=${limit}&clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch top users')
  return res.json()
}

export async function fetchActivityHeatmap(days, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/analytics/activity-heatmap?days=${days}&clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch heatmap')
  return res.json()
}

// ─── Profile / Settings ────────────────────────────────────────
export async function fetchUserProfile(clerkId) {
  const res = await fetch(`${API_BASE}/api/user/profile/${clerkId}?requesterId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

export async function updateUserProfile(clerkId, formData) {
  const res = await fetch(`${API_BASE}/api/user/profile/${clerkId}?clerkId=${clerkId}`, {
    method: 'POST',
    headers: { 'x-clerk-id': clerkId },
    body: formData
  })
  if (!res.ok) throw new Error('Failed to update profile')
  return res.json()
}

export async function fetchSettings(clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/settings?clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

export async function updateSettings(settings, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/settings?clerkId=${clerkId}`, {
    method: 'PUT',
    headers: { 'x-clerk-id': clerkId, 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  if (!res.ok) throw new Error('Failed to update settings')
  return res.json()
}

export async function exportCSV(type, clerkId) {
  const res = await fetch(`${API_BASE}/api/admin/export/${type}?clerkId=${clerkId}`, {
    headers: { 'x-clerk-id': clerkId }
  })
  if (!res.ok) throw new Error('Export failed')
  return res.blob()
}