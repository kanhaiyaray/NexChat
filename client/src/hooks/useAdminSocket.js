import { useEffect, useState } from 'react'
import io from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1000'

export function useAdminSocket(clerkId) {
  const [stats, setStats] = useState(null)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!clerkId) return
    const socketInstance = io(SOCKET_URL)
    setSocket(socketInstance)

    socketInstance.on('connect', () => {
      socketInstance.emit('admin:subscribe')
    })

    socketInstance.on('admin:stats', (data) => {
      setStats(data)
    })

    socketInstance.on('admin:error', (err) => {
      console.error('Admin socket error:', err)
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [clerkId])

  return { stats, socket }
}