class RoomState {
  constructor() {
    this.rooms = {};
    this.socketRooms = {};
    this.connections = {};
  }

  addUser(roomId, socketId, userData) {
    if (!this.rooms[roomId]) {
      this.rooms[roomId] = [];
    }

    this.rooms[roomId] = this.rooms[roomId].filter(u => u.username !== userData.username);

    this.rooms[roomId].push({ id: socketId, ...userData });
    this.socketRooms[socketId] = roomId;

    return this.rooms[roomId];
  }

  removeUser(roomId, socketId) {
    if (!this.rooms[roomId]) return;

    this.rooms[roomId] = this.rooms[roomId].filter(u => u.id !== socketId);

    if (this.rooms[roomId].length === 0) {
      delete this.rooms[roomId];
    }

    delete this.socketRooms[socketId];
  }

  getUsers(roomId) {
    return this.rooms[roomId] || [];
  }

  getUserByUsername(roomId, username) {
    const users = this.getUsers(roomId);
    return users.find(u => u.username === username);
  }

  getOnlineUsernames(roomId) {
    return this.getUsers(roomId).map(u => u.username);
  }

  getRoomForSocket(socketId) {
    return this.socketRooms[socketId] || null;
  }

  setConnection(socketId) {
    this.connections[socketId] = Date.now();
  }

  removeConnection(socketId) {
    delete this.connections[socketId];
  }

  getConnectionCount() {
    return Object.keys(this.connections).length;
  }

  getRoomCount() {
    return Object.keys(this.rooms).length;
  }
}

export const roomState = new RoomState();
export default { roomState };
