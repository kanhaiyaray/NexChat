export const serializeMessage = (msg) => {
  return {
    ...msg,
    id: msg._id?.toString(),
  };
};

export const mergeMessages = (existing, incoming) => {
  const map = new Map(existing.map((message) => [message.id, message]));
  incoming.forEach((message) => {
    if (!message?.id) return;
    map.set(message.id, { ...(map.get(message.id) || {}), ...message });
  });
  return [...map.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

export const buildReactionsMap = (messages = []) => {
  return messages.reduce((acc, msg) => {
    if (msg?.id && msg?.reactions && Object.keys(msg.reactions).length > 0) {
      acc[msg.id] = msg.reactions;
    }
    return acc;
  }, {});
};

export const mergeReactionMaps = (current, messages = []) => {
  const next = { ...current };
  messages.forEach((msg) => {
    if (msg?.id && msg?.reactions && Object.keys(msg.reactions).length > 0) {
      next[msg.id] = { ...(next[msg.id] || {}), ...msg.reactions };
    }
  });
  return next;
};

export const isEditableMessage = (message, username, editWindowMs = 5 * 60 * 1000) => {
  if (!message || message.type !== 'text' || message.sender !== username) {
    return false;
  }
  const timestamp = new Date(message.timestamp).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return Date.now() - timestamp <= editWindowMs;
};

export const shortRoomId = (roomId = '') => {
  return roomId.replace(/^room_/, '').slice(0, 8) || 'private';
};

export default {
  serializeMessage,
  mergeMessages,
  buildReactionsMap,
  mergeReactionMaps,
  isEditableMessage,
  shortRoomId,
};
